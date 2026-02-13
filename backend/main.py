"""
Ploton Backend
- Renders TSX with real Remotion
- S3 asset upload
"""

import re
import json
import uuid
import subprocess
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Ploton")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR    = Path(__file__).parent.parent
REMOTION_DIR = BASE_DIR / "remotion"
RENDERS_DIR  = BASE_DIR / "renders"
RENDER_SCRIPT = REMOTION_DIR / "render-remotion.js"
RENDERS_DIR.mkdir(exist_ok=True)

app.mount("/renders", StaticFiles(directory=str(RENDERS_DIR)), name="renders")

# S3 config from .env
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_BUCKET     = os.getenv("AWS_BUCKET_NAME")
AWS_REGION     = os.getenv("AWS_REGION", "us-east-1")


def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION,
    )


def extract_composition_config(code: str) -> dict:
    defaults = {"duration": 6, "fps": 30, "width": 1080, "height": 1920}
    try:
        match = re.search(r'compositionConfig\s*=\s*\{([^}]+)\}', code, re.DOTALL)
        if not match:
            print("   ⚠️  No compositionConfig found, using defaults")
            return defaults
        config_str = match.group(1)

        def get_val(key, fallback):
            m = re.search(rf'{key}\s*:\s*([\d.]+)', config_str)
            return float(m.group(1)) if m else fallback

        return {
            "duration": get_val('durationInSeconds', defaults['duration']),
            "fps":      int(get_val('fps', defaults['fps'])),
            "width":    int(get_val('width', defaults['width'])),
            "height":   int(get_val('height', defaults['height'])),
        }
    except Exception as e:
        print(f"   ⚠️  Config extraction error: {e}")
        return defaults


class RenderRequest(BaseModel):
    code: str
    output_name: Optional[str] = None


@app.get("/")
def root():
    return {"service": "Ploton", "status": "running"}


@app.get("/health")
def health():
    s3_configured = all([AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET])
    return {"status": "healthy", "s3": s3_configured}


# ─────────────────────────────────────────────
# S3 UPLOAD
# ─────────────────────────────────────────────

@app.post("/api/upload")
async def upload_asset(file: UploadFile = File(...)):
    """Upload asset to S3, return public URL"""

    if not all([AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET]):
        raise HTTPException(
            status_code=500,
            detail="S3 not configured. Add AWS credentials to .env file."
        )

    try:
        ext        = Path(file.filename).suffix.lower()
        unique_name = f"ploton-assets/{uuid.uuid4().hex}{ext}"
        contents   = await file.read()

        # Determine content type
        content_type_map = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
        }
        content_type = content_type_map.get(ext, "application/octet-stream")

        s3 = get_s3_client()
        s3.put_object(
            Bucket=AWS_BUCKET,
            Key=unique_name,
            Body=contents,
            ContentType=content_type,
        )

        # Build public URL
        if AWS_REGION == "us-east-1":
            url = f"https://{AWS_BUCKET}.s3.amazonaws.com/{unique_name}"
        else:
            url = f"https://{AWS_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{unique_name}"

        print(f"✅ Uploaded: {file.filename} → {url}")

        return {
            "status": "success",
            "url": url,
            "filename": file.filename,
            "key": unique_name,
        }

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# RENDER
# ─────────────────────────────────────────────

@app.post("/api/render")
async def render_video(request: RenderRequest):
    render_id = uuid.uuid4().hex[:8]
    print(f"\n🎬 RENDER [{render_id}] | {len(request.code)} chars")

    try:
        # Extract config from code
        config   = extract_composition_config(request.code)
        duration = config["duration"]
        fps      = config["fps"]
        width    = config["width"]
        height   = config["height"]
        print(f"   🎯 {duration}s | {width}x{height} @ {fps}fps")

        # Write user component
        user_component_path = REMOTION_DIR / "src" / "UserComponent.tsx"
        with open(user_component_path, 'w', encoding='utf-8') as f:
            f.write(request.code)
        print(f"   ✅ Wrote UserComponent.tsx")

        output_name = request.output_name or f"ploton_{render_id}"
        output_path = RENDERS_DIR / f"{output_name}.mp4"

        cmd = [
            "node",
            str(RENDER_SCRIPT),
            str(user_component_path),
            str(output_path),
            str(duration),
            str(fps),
            str(width),
            str(height),
        ]

        print(f"   🚀 Starting render...")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=300,
            cwd=str(REMOTION_DIR)
        )

        output = result.stdout + result.stderr

        result_json = None
        for line in output.split('\n'):
            if line.startswith('RESULT_JSON:'):
                try:
                    result_json = json.loads(line.replace('RESULT_JSON:', ''))
                except:
                    pass

        print(output[-3000:] if len(output) > 3000 else output)

        if result_json and result_json.get('success') and output_path.exists():
            print(f"\n✅ SUCCESS! {result_json['fileSizeMb']} MB")
            return {
                "status": "success",
                "video_url": f"http://localhost:8000/renders/{output_name}.mp4",
                "filename": f"{output_name}.mp4",
                "file_size_mb": result_json['fileSizeMb'],
                "duration": duration,
                "width": width,
                "height": height,
            }

        elif result_json and not result_json.get('success'):
            raise HTTPException(status_code=500, detail=result_json.get('error', 'Render failed'))

        elif output_path.exists():
            file_size = output_path.stat().st_size
            return {
                "status": "success",
                "video_url": f"http://localhost:8000/renders/{output_name}.mp4",
                "filename": f"{output_name}.mp4",
                "file_size_mb": round(file_size / 1024 / 1024, 2),
            }

        else:
            raise HTTPException(status_code=500, detail=f"Render failed:\n{output[-2000:]}")

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Render timeout (5 min)")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/renders")
def list_renders():
    renders = []
    for f in sorted(RENDERS_DIR.glob("*.mp4"), key=lambda x: x.stat().st_ctime, reverse=True):
        renders.append({
            "filename": f.name,
            "url": f"http://localhost:8000/renders/{f.name}",
            "size_mb": round(f.stat().st_size / 1024 / 1024, 2),
        })
    return {"renders": renders}


if __name__ == "__main__":
    import uvicorn
    print("\n🎬 PLOTON BACKEND")
    print(f"   S3 Bucket: {AWS_BUCKET or 'NOT CONFIGURED'}")
    print(f"   URL: http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)