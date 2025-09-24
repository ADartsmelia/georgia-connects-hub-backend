# Frontend OAuth Setup Guide

This guide covers setting up Google OAuth on the frontend for the Georgia Connects Hub application.

## 🔧 **Frontend Environment Variables**

Create a `.env` file in your frontend project root with these variables:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_WS_URL=http://localhost:3000

# Google OAuth Configuration
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
REACT_APP_GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback

# App Configuration
REACT_APP_APP_NAME=Georgia Connects Hub
REACT_APP_APP_VERSION=1.0.0
```

## 📦 **Required Frontend Dependencies**

### **For React Applications**

```bash
# Core OAuth library
npm install @google-cloud/oauth2

# Alternative: Google Identity Services
npm install @google-cloud/identity

# HTTP client for API calls
npm install axios

# State management (optional)
npm install @reduxjs/toolkit react-redux

# Routing
npm install react-router-dom
```

### **For Vue.js Applications**

```bash
# Google OAuth for Vue
npm install vue-google-oauth2

# HTTP client
npm install axios

# State management
npm install vuex

# Routing
npm install vue-router
```

### **For Angular Applications**

```bash
# Google OAuth for Angular
npm install @angular/google-maps

# HTTP client
npm install @angular/common

# State management
npm install @ngrx/store
```

## 🔐 **Google OAuth Frontend Implementation**

### **React Implementation Example**

#### **1. Google OAuth Hook**

```javascript
// hooks/useGoogleAuth.js
import { useState, useEffect } from "react";
import axios from "axios";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_BASE_URL = process.env.REACT_APP_API_URL;

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Initialize Google OAuth
  useEffect(() => {
    const initializeGoogleAuth = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
      }
    };

    // Load Google OAuth script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = initializeGoogleAuth;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    setError(null);

    try {
      // Send the credential to your backend
      const result = await axios.post(`${API_BASE_URL}/auth/google`, {
        credential: response.credential,
      });

      // Store the JWT token
      localStorage.setItem("token", result.data.token);
      localStorage.setItem("refreshToken", result.data.refreshToken);

      setUser(result.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setUser(null);

    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  return {
    user,
    isLoading,
    error,
    signIn,
    signOut,
  };
};
```

#### **2. Google Sign-In Button Component**

```javascript
// components/GoogleSignInButton.jsx
import React from "react";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

const GoogleSignInButton = () => {
  const { signIn, isLoading, error } = useGoogleAuth();

  return (
    <div className="google-signin-container">
      <button
        onClick={signIn}
        disabled={isLoading}
        className="google-signin-btn"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 24px",
          border: "1px solid #dadce0",
          borderRadius: "4px",
          backgroundColor: "#fff",
          color: "#3c4043",
          fontSize: "14px",
          fontWeight: "500",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <span>Signing in...</span>
        ) : (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              style={{ marginRight: "12px" }}
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </button>
      {error && (
        <div
          className="error-message"
          style={{ color: "red", marginTop: "8px" }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;
```

#### **3. Authentication Context**

```javascript
// context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Verify token with backend
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData, token, refreshToken) => {
    setUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("refreshToken", refreshToken);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

## 🌐 **Google Cloud Console Frontend Configuration**

### **1. Add Frontend Origins**

In your Google Cloud Console OAuth client:

**Authorized JavaScript origins:**

```
http://localhost:8080
http://localhost:3000
https://yourdomain.com
```

**Authorized redirect URIs:**

```
http://localhost:8080/auth/google/callback
http://localhost:3000/api/v1/auth/google/callback
https://yourdomain.com/auth/google/callback
```

### **2. Frontend-Specific Scopes**

Add these scopes to your OAuth consent screen:

- `openid`
- `email`
- `profile`

## 🔄 **OAuth Flow Implementation**

### **Frontend OAuth Flow**

1. **User clicks "Sign in with Google"**
2. **Google OAuth popup/redirect opens**
3. **User authorizes your app**
4. **Google returns authorization code**
5. **Frontend sends code to backend**
6. **Backend exchanges code for user info**
7. **Backend returns JWT token**
8. **Frontend stores token and redirects user**

### **Backend Integration**

Your backend should have these endpoints:

```javascript
// Backend routes needed
POST / api / v1 / auth / google; // Handle Google OAuth callback
GET / api / v1 / auth / me; // Get current user
POST / api / v1 / auth / refresh; // Refresh JWT token
POST / api / v1 / auth / logout; // Logout user
```

## 🛡️ **Security Best Practices**

### **Frontend Security**

1. **Never expose client secret** in frontend code
2. **Use HTTPS** in production
3. **Validate tokens** on every API call
4. **Implement token refresh** mechanism
5. **Clear sensitive data** on logout

### **Environment Variables**

```env
# ✅ Safe for frontend (starts with REACT_APP_)
REACT_APP_GOOGLE_CLIENT_ID=your_client_id
REACT_APP_API_URL=http://localhost:3000/api/v1

# ❌ Never expose in frontend
GOOGLE_CLIENT_SECRET=your_secret
JWT_SECRET=your_jwt_secret
```

## 🧪 **Testing Your Setup**

### **1. Test OAuth Flow**

```javascript
// Test component
const TestOAuth = () => {
  const { signIn, user, error } = useGoogleAuth();

  return (
    <div>
      <h2>OAuth Test</h2>
      {user ? (
        <div>
          <p>Welcome, {user.name}!</p>
          <p>Email: {user.email}</p>
        </div>
      ) : (
        <button onClick={signIn}>Test Google Sign In</button>
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
};
```

### **2. Test API Integration**

```javascript
// Test API calls
const testAPI = async () => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    console.log("API Test Success:", response.data);
  } catch (error) {
    console.error("API Test Failed:", error);
  }
};
```

## 🚀 **Production Deployment**

### **Environment Variables for Production**

```env
# Production environment
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
REACT_APP_GOOGLE_CLIENT_ID=your_production_client_id
REACT_APP_GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

### **Google Cloud Console Production Setup**

1. **Add production domains** to authorized origins
2. **Update redirect URIs** for production
3. **Publish your OAuth consent screen**
4. **Verify your domain** (recommended)

## 📱 **Mobile App Integration**

For React Native or mobile apps:

```javascript
// React Native Google Sign-In
import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: "your_web_client_id", // Same as REACT_APP_GOOGLE_CLIENT_ID
  offlineAccess: true,
});
```

## 🆘 **Troubleshooting**

### **Common Issues**

1. **"Invalid origin"**: Check authorized JavaScript origins
2. **"Invalid redirect URI"**: Verify redirect URIs match exactly
3. **"Access blocked"**: Complete OAuth consent screen setup
4. **"CORS error"**: Configure CORS on your backend
5. **"Token expired"**: Implement token refresh logic

### **Debug Steps**

1. **Check browser console** for errors
2. **Verify environment variables** are loaded
3. **Test OAuth flow** step by step
4. **Check network requests** in DevTools
5. **Verify backend endpoints** are working

## 📚 **Additional Resources**

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [React Google OAuth Examples](https://github.com/google/google-api-javascript-client)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

This setup will provide a complete Google OAuth integration for your frontend application!

