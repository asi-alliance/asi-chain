# GitHub Actions Setup Guide

## 🚀 Automated Deployment Setup

Your GitHub Actions workflows are ready! Now you need to configure the repository secrets so GitHub can deploy to your server.

## 🔐 Setup Repository Secrets

**Step 1:** Go to your GitHub repository: `https://github.com/asi-alliance/asi-chain`

**Step 2:** Click: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 3 secrets:

### 1. **DEPLOY_HOST**
- **Name**: `DEPLOY_HOST`  
- **Value**: `13.251.66.61`

### 2. **DEPLOY_USER**
- **Name**: `DEPLOY_USER`
- **Value**: `ubuntu`

### 3. **DEPLOY_KEY**
- **Name**: `DEPLOY_KEY`
- **Value**: The contents of your SSH private key file

To get the SSH key value:
```bash
cat XXXXX
```

Copy the **entire** key including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines.

## 🔄 How It Works

### **For Technical Writers:**
1. ✏️ Edit any `.md` file on GitHub.com
2. 💾 Click "Commit changes"
3. 🤖 GitHub Actions automatically builds & deploys
4. 🌐 Site updates at https://13.251.66.61 in ~3-5 minutes

### **For Pull Requests:**
1. 🔀 Create pull request with changes
2. 🧪 Automatic build testing runs
3. ✅ Merge PR when tests pass
4. 🚀 Auto-deploy to live site

## 📋 Workflow Files Created

### **`.github/workflows/deploy.yml`**
- Triggers on push to main branch
- Builds site and deploys to server
- Full production deployment

### **`.github/workflows/build-test.yml`**  
- Triggers on pull requests
- Tests build without deploying
- Ensures changes don't break the site

## ✅ Testing the Setup

After adding the secrets:

1. **Make a test edit** on GitHub:
   - Go to `docs/intro.md`
   - Click ✏️ pencil icon
   - Add a test line like "<!-- Test edit -->"
   - Commit the change

2. **Watch the deployment**:
   - Go to repository → "Actions" tab
   - See the workflow running
   - Wait for green ✅ completion

3. **Verify the update**:
   - Check https://13.251.66.61
   - Your change should be live!

## 🆘 Troubleshooting

### **Build Fails**
- Check Actions tab for error details
- Usually markdown syntax errors
- Fix in GitHub web editor

### **Deployment Fails**  
- Verify all 3 secrets are set correctly
- Check SSH key format is complete
- Ensure server (13.251.66.61) is accessible

### **Changes Not Appearing**
- Wait 5 minutes for full deployment
- Check Actions tab shows successful deploy
- Try hard refresh (Ctrl+F5)

## 🎯 Next Steps

1. **Add the 3 GitHub secrets** (see above)
2. **Share TECHNICAL_WRITER_GUIDE.md** with your team
3. **Test with a small edit** to verify everything works
4. **Your technical writers can now edit directly on GitHub!**

## 🔗 Quick Links

- **Live Site**: https://13.251.66.61
- **GitHub Actions**: [Repository Actions Tab]
- **Technical Writer Guide**: `TECHNICAL_WRITER_GUIDE.md`

Once secrets are configured, your technical writers can maintain the site entirely through GitHub's web interface! 🎉