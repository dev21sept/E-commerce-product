# Update & Maintenance Guide (EC2)

Use this guide whenever you make changes to your code and want to see them live on your server.

---

## 1. Manual Update Process (The "Quick Fix")

Run these commands in order to update your live server manually:

```bash
# 1. Go to project root
cd ~/E-commerce-product

# 2. Pull latest code from GitHub
git pull origin main

# 3. Update Backend
cd backend
npm install
pm2 restart valisting-backend

# 4. Update Frontend (Only if frontend code changed)
cd ../frontend
npm install
npm run build
# (Nginx picks up changes automatically from the dist folder)
```

---

## 2. Automated Updates (GitHub Actions)

If you have set up the `.github/workflows/deploy.yml` file, you don't need to do anything!
1. Just run `git push origin main` from your local VS Code.
2. GitHub will automatically connect to your EC2 and run all the commands above.

---

## 3. Useful "Checking" Commands

If something is not working after an update, use these:

| Goal | Command |
| :--- | :--- |
| **Check if Backend is running** | `pm2 status` |
| **See Backend Errors** | `pm2 logs valisting-backend` |
| **Check Nginx Status** | `sudo systemctl status nginx` |
| **Check Nginx Error Logs** | `sudo tail -f /var/log/nginx/error.log` |
| **Check MongoDB Status** | `sudo systemctl status mongod` |

---

## 4. Reset Everything (In case of disaster)

If the server is behaving strangely, try a full restart:
```bash
sudo systemctl restart nginx
sudo systemctl restart mongod
pm2 restart all
```
