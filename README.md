# 📱 Mobile App Development Setup

## Prerequisites

Before starting, make sure the following tools are installed:

* Node.js (v16 or later)
* Expo CLI
* iOS Simulator (macOS only) or Android Emulator
* Physical iOS/Android device (optional)

---

# ⚙️ Environment Setup

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd senas_mobile_app
```

---

## 2. Install Dependencies

```bash
npm install

# or

yarn install
```

---

## 3. Start the Laravel Backend

Make sure the Laravel backend is running before launching the mobile application.

```bash
cd ../Senas_TeacherWebDashboard

php artisan serve --host=0.0.0.0 --port=8000
```

---

## 4. Configure API URL

### Option A: Local IP Address (Recommended for Physical Devices)

Find your local IP address:

#### macOS / Linux

```bash
ipconfig getifaddr en0

# or

ifconfig | grep "inet " | grep -v 127.0.0.1
```

#### Windows

```bash
ipconfig | findstr "IPv4"
```

Update `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://YOUR_IP_ADDRESS:8000/api"
    }
  }
}
```

---

### Option B: Localhost (Emulator/Simulator Only)

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://localhost:8000/api"
    }
  }
}
```

---

### Option C: ngrok (External Testing)

Install and configure ngrok:

```bash
# macOS
brew install ngrok

# Add your auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Expose Laravel server
ngrok http 8000
```

Copy the generated HTTPS URL and update `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-ngrok-url.ngrok-free.app/api"
    }
  }
}
```

---

# 🚀 Running the Application

## Start Expo Development Server

```bash
npx expo start
```

---

## Run on iOS Simulator

```bash
# Press "i" in the Expo terminal

# or

npx expo start --ios
```

---

## Run on Android Emulator

```bash
# Press "a" in the Expo terminal

# or

npx expo start --android
```

---

## Run on a Physical Device

1. Install **Expo Go** from the App Store or Google Play Store.
2. Open Expo Go.
3. Scan the QR code shown in the terminal.
4. Ensure your device and computer are connected to the same Wi-Fi network.

---

# 🛠️ Troubleshooting

## 1. Network Request Timed Out

Verify your IP address:

```bash
ipconfig getifaddr en0
```

Ensure:

* The API URL in `app.json` matches your local IP.
* Laravel is running.

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

---

## 2. JSON Parse Error

Clear Laravel caches:

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

Restart Laravel:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

---

## 3. SafeAreaView Has Been Deprecated

Install the recommended package:

```bash
npx expo install react-native-safe-area-context
```

Replace:

```javascript
import { SafeAreaView } from 'react-native';
```

With:

```javascript
import { SafeAreaView } from 'react-native-safe-area-context';
```

---

## 4. Database Connection Error

Check MySQL status:

```bash
brew services list | grep mysql
```

Start MySQL if necessary:

```bash
brew services start mysql
```

Verify your Laravel `.env` file:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=senas_db
DB_USERNAME=root
DB_PASSWORD=your_password
```

---

## 5. Expo Cache Issues

Clear the cache and restart Expo:

```bash
npx expo start -c
```

---

# 📚 Quick Commands Reference

| Command                                        | Description                |
| ---------------------------------------------- | -------------------------- |
| `ipconfig getifaddr en0`                       | Get local IP address       |
| `php artisan serve --host=0.0.0.0 --port=8000` | Start Laravel backend      |
| `npx expo start -c`                            | Start Expo and clear cache |
| `php artisan optimize:clear`                   | Clear Laravel caches       |
| `brew services list \| grep mysql`             | Check MySQL status         |

---

# 🔐 Environment Variables

Create an optional `.env` file in the mobile application root:

```env
API_URL=http://192.168.1.35:8000/api
```

---

# 📂 Project Structure

```text
senas_mobile_app/
├── app/
│   ├── (tabs)/
│   │   ├── dashboard.tsx
│   │   └── ...
│   ├── lesson/
│   │   └── [id].tsx
│   └── services/
│       └── api.js
├── assets/
├── app.json
└── package.json
```

---

# ⚡ Useful Shell Aliases

Add the following to your `~/.zshrc` or `~/.bashrc`:

```bash
# Get local IP
alias myip="ipconfig getifaddr en0"

# Start Laravel backend
alias start-laravel="php artisan serve --host=0.0.0.0 --port=8000"

# Start Expo and clear cache
alias start-expo="npx expo start -c"

# Clear Laravel caches
alias clear-laravel="php artisan optimize:clear"
```

Reload your shell:

```bash
source ~/.zshrc

# or

source ~/.bashrc
```
