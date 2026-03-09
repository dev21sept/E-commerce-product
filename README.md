# eBay Product Management Admin Panel

A modern, clean, and attractive full-stack web application for product management with automated eBay data fetching.

## Features

- **Automated Scraper**: Paste an eBay product link and click "Fetch Product" to auto-fill all fields.
- **Modern Dashboard**: Clean sidebar, top navbar, and card-based layout inspired by Shopify/Notion.
- **Full CRUD**: Add, Edit, Delete, and List products.
- **Rich Data**: Extract title, descriptions, price, condition, brand, specifications, and high-res images.
- **Premium UI**: Smooth animations, responsive design, and premium color palette (#4F46E5).

## Tech Stack

- **Frontend**: React.js, TailwindCSS, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express.js, Puppeteer (Scraping).
- **Database**: MySQL.

## Installation & Setup

### 1. Database Setup
Execute the following SQL commands in your MySQL environment:
```sql
CREATE DATABASE ebay_admin_db;
USE ebay_admin_db;
-- Import the schema from the root schema.sql file
```

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   npm install
   ```
2. Configure your `.env` file with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=yourpassword
   DB_NAME=ebay_admin_db
   ```
3. Start the backend:
   ```bash
   npm start
   ```

### 3. Frontend Setup
1. Open another terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Main Workflow
1. Navigate to **Add Product**.
2. Paste an eBay URL (e.g., https://www.ebay.com/itm/354838957999).
3. Click **Import from eBay**.
4. Review the auto-filled fields and images.
5. Click **Save Product**.
