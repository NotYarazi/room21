<img src="https://github.com/NotYarazi/room21/blob/main/brand/Room21.png" align="left" width="180"/>

### `Room21 v4.1.2`

### A modern, secure, and anonymous real-time chat application built with Node.js, WebSockets, and modern web technologies.
---
---
## Features

### Security & Privacy
- **Complete anonymity** - No registration required
- **HTTPS/WSS encryption** - Secure connections
- **Input sanitization** - XSS protection
- **Rate limiting** - Spam protection
- **Content Security Policy** - Enhanced security headers

### Chat Features
- **Real-time messaging** - Instant communication
- **User mentions** (@username) with sound notifications
- **Dynamic usernames** - Generated or custom nicknames
- **Message persistence** - Local storage for chat history
- **Commands system** - `/help`, `/nick`, `/users`, `/clear`
- **Character counter** - 500 character limit with visual feedback

### Modern UI/UX
- **Glassmorphism design** - Beautiful modern interface
- **Responsive layout** - Works on all devices
- **Dark theme** - Easy on the eyes
- **Smooth animations** - Enhanced user experience
- **PWA support** - Install as mobile/desktop app
- **Accessibility** - Screen reader support, keyboard navigation

### Technical Features
- **WebSocket connections** - Real-time communication
- **Service Worker** - Offline capability and caching
- **Auto-reconnection** - Handles network issues
- **Message queuing** - Queues messages when offline
- **Error handling** - Graceful error recovery

## Quick Start

### Prerequisites
- **Node.js** v16 or higher
- **npm** or **yarn** package manager
- **SSL certificates** (for HTTPS - recommended for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/notYarazi/room21.git
   cd Room21
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure server type (Optional)**
   - **HTTP Mode** (Development): Default, no certificates needed
   - **HTTPS Mode** (Production): Requires SSL certificates
   - Set via environment variable: `USE_HTTPS=true` or `USE_HTTPS=false`

4. **Set up SSL certificates (Only for HTTPS mode)**
   - Create the certificate directory: `src/public/assets/cert/`
   - Place your SSL certificate files:
     - `cert.pem` - SSL certificate
     - `key.pem` - Private key
   - For development, you can generate self-signed certificates

5. **Start the server**
   ```bash
   # Development (HTTP) - Default
   npm run dev
   
   # Development (HTTPS) - Requires certificates
   npm run dev:https
   
   # Production (HTTPS)
   npm run prod
   
   # Manual control
   USE_HTTPS=false npm start  # HTTP mode
   USE_HTTPS=true npm start   # HTTPS mode
   ```

6. **Access the application**
   - **HTTP Mode**: `http://localhost:3000`
   - **HTTPS Mode**: `https://localhost:3000`
   - Accept the self-signed certificate warning if using development certificates

## Configuration

### Server Protocol
The server can run in HTTP or HTTPS mode:

- **HTTP Mode** (Default): `USE_HTTPS=false`
  - Faster setup for development
  - No SSL certificates required
  - Not suitable for production

- **HTTPS Mode**: `USE_HTTPS=true`
  - Secure encrypted connections
  - Requires SSL certificates
  - Recommended for production

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)
- `SESSION_SECRET` - Session secret key

### Security Settings
- Message rate limiting: 1 message per second
- Maximum message length: 500 characters
- Session timeout: 24 hours

## PWA Installation

Room21 can be installed as a Progressive Web App:

1. Open the app in a supported browser
2. Look for the "Install" or "Add to Home Screen" option
3. Follow the browser prompts to install

## Chat Commands

- `/help` - Show available commands
- `/nick <name>` - Change your nickname
- `/users` - List online users
- `/clear` - Clear chat history (admin-like feature)

## Architecture

### Backend (Node.js)
- **Express.js** - Web server framework
- **WebSocket** - Real-time communication
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Express-session** - Session management

### Frontend (Vanilla JS)
- **Modern ES6+** - Clean, modern JavaScript
- **CSS Variables** - Consistent theming
- **WebSocket API** - Real-time communication
- **Service Worker** - PWA functionality
- **Local Storage** - Message persistence

### File Structure
- Check **[File Structure File](PROJECT_STRUCTURE.md)**

## Security Features

### Input Validation
- HTML sanitization to prevent XSS
- Message length limits
- Command validation
- Username format validation

### Rate Limiting
- Per-client message rate limiting
- Spam protection mechanisms
- Connection throttling

### Network Security
- HTTPS/WSS enforcement
- CORS policy configuration
- Security headers (CSP, X-Frame-Options, etc.)
- Session security

## Development

### Local Development
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Make changes and test locally

### Adding Features
- **Server-side**: Modify `server.js` for backend features
- **Client-side**: Update `script.js` for frontend features
- **Styling**: Edit `style.css` for UI changes

### Testing
- Test WebSocket connections
- Verify security features
- Check responsive design
- Test PWA functionality

## Documentation

- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to the project
- **[Changelog](CHANGELOG.md)** - Detailed version history and changes
- **[License](LICENSE)** - Creative Commons licensing terms

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

### Quick Contributing Steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Credits

- **UmaEra (NotYarazi)** - Original development

- **wassammy & dhummy** - Contributors (testing & support)

- **Community** - Thanks to all users and contributors out there!

---

## License & Privacy

### License
This project is licensed under the **DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE**.

- ✅ **Free to use** for non-commercial purposes
- ✅ **Free to distribute** and share
- ✅ **Free to modify** and adapt
- ✅ **Free to use commercially** without permission
- ✅ **No Attribution required** when sharing or modifying

so.. absolute freedom, do whatever, just make it cool.

See the [LICENSE](LICENSE) file for details.

### Privacy
Room21 is built with **privacy-first principles**:
- No user registration or personal data collection
- No server-side message storage
- Complete anonymity by design
- HTTPS/WSS encryption for all communications
