# Firebase Firestore & Authentication Setup Guide

## ✅ What I Fixed

1. **Added Anonymous Authentication** – App now signs in anonymously to access Firestore
2. **Improved Error Messages** – Shows actual Firebase error codes/messages in alerts
3. **Better Console Logging** – Full error details logged for debugging

---

## 🔐 Complete Setup Instructions

Follow these steps **in order** to enable product creation and cloud sync:

### Step 1: Enable Anonymous Authentication
**In Firebase Console:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **setu-erp-c18a5**
3. Navigate to **Authentication** (left sidebar)
4. Click **Sign-in method** tab
5. Find **Anonymous** provider
6. Click on it and toggle **Enable** ON
7. Click **Save**

✅ **Status Check:** You should see "Anonymous" listed as enabled

---

### Step 2: Create Firestore Collections
**In Firebase Console:**
1. Go to **Firestore Database** (left sidebar)
2. Click **Create Database**
3. Choose **Start in test mode** (for development)
4. Select region: **asia-south1** (for India)
5. Click **Create**

Once created, manually create these collections:
- Click **+ Create Collection**
- Name: `products` → Add first document with ID: `temp` with fields:
  ```json
  {
    "name": "Placeholder",
    "price": 0,
    "companyId": "test",
    "stock": 0,
    "sku": "TEMP"
  }
  ```
  Then delete this temp document.

Repeat for:
- `companies`
- `customers`
- `transactions`

---

### Step 3: Set Firestore Security Rules
**In Firebase Console:**
1. Go to **Firestore Database** → **Rules** tab
2. Replace entire content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all authenticated users (including anonymous) to read and write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

✅ **Publish Status:** Should show green checkmark

---

## 🧪 Test Your Setup

### Test 1: Check Auth Status (Browser Console)
1. Open app at http://localhost:3001
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. You should see:
   ```
   ✓ Anonymous auth successful. User ID: [long-id]
   ```

### Test 2: Try Adding a Product
1. Login to app
2. Select a company from sidebar
3. Go to **Catalog** tab
4. Click **+ Add New Product**
5. Fill in form and click **Add to Catalog**
6. Should succeed OR show specific error code

### Test 3: Check Firestore Console
1. Go to Firebase Console → Firestore Database
2. Should see new documents in `products` collection
3. If documents appear = ✅ Setup successful!

---

## 🐛 Troubleshooting by Error Code

| Error Code | Cause | Solution |
|-----------|-------|----------|
| `permission-denied` | Rules don't allow write | Update rules (Step 3) |
| `unauthenticated` | No auth session | Enable Anonymous (Step 1) |
| `not-found` | Collection doesn't exist | Create collections (Step 2) |
| `failed-precondition` | Database not initialized | Create database (Step 2) |
| `invalid-argument` | Bad field types | Check field names match schema |

---

## 📋 Quick Checklist

- [ ] Anonymous Authentication enabled in Firebase
- [ ] Firestore Database created (test mode)
- [ ] Collections created: `companies`, `products`, `customers`, `transactions`
- [ ] Security Rules published
- [ ] Browser console shows "✓ Anonymous auth successful"
- [ ] Can add product without errors

---

## 🔒 Production Rules (Later)

For production, use restrictive rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{document=**} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && 
        request.resource.data.price > 0 &&
        request.resource.data.companyId != null;
      allow delete: if request.auth.uid == resource.data.createdBy;
    }
  }
}
```

---

## ❓ Still Not Working?

1. **Check console for errors:** Press F12 → Console tab → look for red errors
2. **Paste exact error message** from alert box
3. **Verify:** Go to Firebase Console and confirm settings are saved
4. **Reload:** Hard refresh browser (Ctrl+Shift+R)
5. **Check network:** Open DevTools → Network tab → filter by "firestore" to see actual requests

