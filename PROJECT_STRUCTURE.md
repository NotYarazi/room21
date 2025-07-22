# Room21 - Project Structure Guide

## Overview
Room21 has been reorganized with a clean folder structure that separates concerns and makes the codebase more maintainable.

## Directory Structure

```
Room21/
├── 📁 src/                   # Source code (main application)
│   ├── 📄 server.js          # Main Node.js server
│   └── 📁 public/            # Static web files served to clients
│       ├── 📄 index.html     # Main HTML page
│       ├── 📄 manifest.json  # PWA manifest
│       ├── 📄 sw.js          # Service Worker for PWA
│       ├── 📁 css/           # Stylesheets
│       │   └── 📄 style.css  # Main Copilot-inspired styles
│       ├── 📁 js/            # Client-side JavaScript
│       │   └── 📄 script.js  # Main client application logic
│       └── 📁 assets/        # Static assets
│           ├── 📁 fonts/     # Font files (QuickSand.ttf)
│           ├── 📁 icons/     # Icons and images
│           ├── 📁 sounds/    # Sound effects (ping.wav)
│           └── 📁 cert/      # SSL certificates
├── 📁 data/                  # Application data and logs
│   ├── 📄 *.json            # Configuration and session data
│   └── 📄 *.log             # Application logs
├── 📁 brand/                # About the developers & good use of the assets
├── 📄 package.json          # Node.js dependencies and scripts
├── 📄 README.md             # Main documentation
├── 📄 changelog.md          # Version history
└── 📄 PROJECT_STRUCTURE.md  # This file
```

## Key Benefits of the New Structure

### 🎯 **Clear Separation of Concerns**
- **`src/`** - Contains all application source code
- **`src/public/`** - Web assets served directly to clients
- **`scripts/`** - Utility and development tools
- **`data/`** - Runtime data, logs, and configuration
- **`brand/`** -About the developers & good use of the assets

### 🚀 **Improved Development Experience**
- Easier navigation and file discovery
- Clear distinction between server and client code
- Logical grouping of related files
- Better IDE support and intellisense

### 📦 **Better Production Deployment**
- Clean separation of assets
- Optimized static file serving
- Easier Docker containerization
- Clear build and deployment paths

### 🔧 **Enhanced Maintainability**
- Modular file organization
- Easier to add new features
- Simplified backup and versioning
- Better collaboration support

## File Organization Rules

### **Source Code (`src/`)**
- Main application server logic
- Public web assets organized by type
- All files served to end users

### **Scripts (`scripts/`)**
- Development utilities
- Automation tools
- External executables
- Build and deployment scripts

### **Data (`data/`)**
- Runtime application data
- Log files
- Configuration files
- Database files


## Quick Start with New Structure

1. **Development**:
   ```bash
   npm install
   npm run dev
   ```

2. **Production**:
   ```bash
   npm start
   ```

3. **File Locations**:
   - Server: `src/server.js`
   - Client: `src/public/index.html`
   - Styles: `src/public/css/style.css`
   - Scripts: `src/public/js/script.js`
   - Assets: `src/public/assets/`

## Migration Notes

- **Updated package.json**: Main entry point now `src/server.js`
- **Updated server.js**: Static file serving from `src/public/`
- **Updated HTML**: CSS/JS paths updated to new locations
- **Updated Service Worker**: Cache paths updated for new structure
- **Updated README**: Documentation reflects new organization

---

*This structure follows modern web development best practices and makes Room21 more scalable and maintainable.*
