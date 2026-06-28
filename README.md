# 📱 Mobile App Development Setup

## 📋 Prerequisites

Before starting, make sure the following tools are installed:

- Node.js & npm
- Expo CLI
- PHP 8.0+ with Composer
- ngrok (for HTTPS tunneling)
- iOS Simulator (macOS only) or Android Emulator (optional)
- Physical iOS/Android device with Expo Go (recommended)

---

# ⚙️ Environment Setup

## 1. Clone the Repository

```bash
git clone https://github.com/danahparis21/senas_mobile_app.git
cd senas_mobile_app
```

---

## 2. Install Dependencies

```bash
npm install
```

Install the required Expo packages:

```bash
npx expo install react-native-webview expo-web-browser expo-camera
```

---

# 🖥️ Running the Laravel Backend

Navigate to the Laravel backend:

```bash
cd ../Senas_TeacherWebDashboard
```

Install PHP dependencies:

```bash
composer install
```

Create the environment file and generate the application key:

```bash
cp .env.example .env
php artisan key:generate
```

Run the Laravel server:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

---

# 🌐 Configure API URL

## Option A: Local IP Address (Recommended for Physical Devices)

Find your local IP address.

### macOS / Linux

```bash
ipconfig getifaddr en0

# or

ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Windows

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

## Option B: Localhost (Simulator/Emulator)

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

## Option C: ngrok (Recommended for Gesture Recognition)

Since the gesture recognition feature uses a WebView with camera access, HTTPS is required (especially on iOS).

Start ngrok:

```bash
ngrok http 8000 --host-header=rewrite
```

Copy the generated HTTPS URL, for example:

```
https://abc123.ngrok-free.app
```

Update:

- `GESTURE_URL` in `app/gesture/webview-camera.tsx`

or your API URL if necessary.

---

# 🚀 Running the Mobile App

Start the Expo development server:

```bash
npx expo start -c
```

Then:

- Open **Expo Go**
- Scan the QR Code
- Ensure your phone and computer are connected to the same Wi-Fi network

---

## iOS Simulator

```bash
npx expo start --ios
```

or press **i** inside the Expo terminal.

---

## Android Emulator

```bash
npx expo start --android
```

or press **a** inside the Expo terminal.

---

# 🔄 Recommended Development Workflow

1. Start the Laravel backend.
2. Start ngrok.
3. Copy the ngrok HTTPS URL.
4. Update `GESTURE_URL` inside `app/gesture/webview-camera.tsx`.
5. Start Expo.
6. Test the application using Expo Go.

---

# 🔑 Important Notes

## Camera Access

- **iOS Safari:** HTTPS is required for camera access.
- **Android:** HTTP works, but HTTPS is recommended.
- **Development:** Use ngrok for HTTPS tunneling.

---

## Gesture Recognition

- **A–Y:** TensorFlow Lite model
- **J & Z:** Heuristic detection (ported from the Python implementation)
- **Real-time detection:** MediaPipe.js running inside a WebView

---

## Why WebView Instead of Native Camera?

The project uses **MediaPipe.js inside a WebView** because it:

- Works in Expo Go (no custom development build required)
- Provides consistent performance across iOS and Android
- Makes updating ML models easier

---

# 🛠️ Troubleshooting

## Network Request Timed Out

Verify your IP address:

```bash
ipconfig getifaddr en0
```

Ensure:

- The API URL is correct.
- Laravel is running.

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

---

## JSON Parse Error

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

## SafeAreaView Has Been Deprecated

Install:

```bash
npx expo install react-native-safe-area-context
```

Replace:

```javascript
import { SafeAreaView } from 'react-native';
```

with:

```javascript
import { SafeAreaView } from 'react-native-safe-area-context';
```

---

## Database Connection Error

Check MySQL:

```bash
brew services list | grep mysql
```

Start MySQL:

```bash
brew services start mysql
```

Example `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=senas_db
DB_USERNAME=root
DB_PASSWORD=your_password
```

---

## Expo Cache Issues

```bash
npx expo start -c
```

---

# 📚 Quick Commands

| Command | Description |
|----------|-------------|
| `npm install` | Install project dependencies |
| `composer install` | Install Laravel dependencies |
| `php artisan serve --host=0.0.0.0 --port=8000` | Start Laravel backend |
| `ngrok http 8000 --host-header=rewrite` | Create HTTPS tunnel |
| `npx expo start -c` | Start Expo and clear cache |
| `php artisan optimize:clear` | Clear Laravel caches |

---

# 🔐 Environment Variables

Optional mobile `.env`:

```env
API_URL=http://192.168.1.35:8000/api
```

---

# 📂 Project Structure

```text
senas_mobile_app/
├── app/
│   ├── (tabs)/                     # Main application tabs
│   ├── gesture/
│   │   ├── webview-camera.tsx      # WebView camera integration
│   │   └── utils/
│   │       └── heuristics.ts       # J/Z gesture heuristics
│   └── _layout.tsx                 # Navigation setup
├── assets/
│   └── models/                     # TensorFlow Lite models
├── services/
│   └── api.js                      # Laravel API integration
├── app.json                        # Expo configuration
└── package.json
```

---

# ⚡ Useful Shell Aliases

```bash
alias myip="ipconfig getifaddr en0"
alias start-laravel="php artisan serve --host=0.0.0.0 --port=8000"
alias start-expo="npx expo start -c"
alias clear-laravel="php artisan optimize:clear"
```

Reload your shell:

```bash
source ~/.zshrc

# or

source ~/.bashrc
```