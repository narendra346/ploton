# Ploton

Paste AI-generated TSX code → renders a real MP4 on your machine.

---

## What you need before starting

- [Node.js 18+](https://nodejs.org)
- [Python 3.10+](https://python.org)
- An AWS S3 bucket (for storing your videos/images)

---

## S3 Setup

This takes about 10 minutes. Do it once.

**Create a bucket**

1. Go to [console.aws.amazon.com](https://console.aws.amazon.com) → search S3 → Create bucket
2. Name it anything (e.g. `my-ploton-assets`)
3. Pick your region (India = `ap-south-1`)
4. Uncheck "Block all public access" → confirm → Create bucket

**Make it public**

Open your bucket → Permissions tab → Bucket policy → Edit → paste this (replace `YOUR-BUCKET-NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

**Set CORS**

Still in Permissions → CORS → Edit → paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

**Get your access keys**

AWS Console → IAM → Users → your user → Security credentials → Create access key → Local code → copy both keys (you won't see the secret again)

---

## Installation

```bash
git clone https://github.com/narendra346/ploton.git
cd ploton
```

Add your credentials:

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in:

```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=my-ploton-assets
AWS_REGION=ap-south-1
```

Install everything:

```bash
cd backend && pip install -r requirements.txt
cd ../remotion && npm install
cd ../frontend && npm install
```

---

## Running

Two terminals, keep both open:

```bash
# Terminal 1
cd backend && python main.py

# Terminal 2
cd frontend && npm run dev
```

Open **http://localhost:3000**

If you see `S3 Bucket: NOT CONFIGURED` in terminal 1 — check your `.env` file.

---

## Using Ploton

**Step 1 — Upload your assets**

Go to the **Assets** tab. Drag and drop your videos or images. Once uploaded, hit **Copy URL** — that's what goes into your animation code.

**Step 2 — Generate code with AI**

Open the [PLOTON TSX Generator](https://gemini.google.com/gem/1fu6c1M8nhLNhcnKPO16GhVDkGrIH_X8Q?usp=sharing) — it will ask you about your style, assets, and what you want. Answer the questions, and it generates the TSX code for you.

**Step 3 — Render**

Paste the TSX code in the **Code** tab. Hit **Render Video**. First render takes a minute or two. When done, click **Download MP4**.

Your renders are also saved in the `renders/` folder on your machine.

---

## License

MIT
```

**Windows:**
```bash
git clone https://github.com/yourname/ploton
cd ploton
setup.bat
```

### Run

**Terminal 1 (Backend):**
```bash
cd backend
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Open: **http://localhost:3000**

---

## Renders

All videos saved locally in `/renders` folder.

---

## License

MIT - Free and open source!
