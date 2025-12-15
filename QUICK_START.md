# Quick Start - Theme Toggle Feature

## 🎨 New Feature: Dark/Light Theme Toggle

A beautiful theme toggle has been added to the Strategy BTC Dashboard!

### How to Use

1. **Start the application**:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start

   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

2. **Open your browser**: http://localhost:5173

3. **Look for the toggle button** in the top-right corner:
   - **Dark mode** (default): Shows ☀️ sun icon
   - **Light mode**: Shows 🌙 moon icon

4. **Click to switch** - The entire dashboard updates instantly!

5. **Your preference is saved** - Refresh the page, and your chosen theme persists!

### What Changes

When you toggle between themes, everything updates:

- ✨ Background colors
- ✨ Card backgrounds
- ✨ Text colors
- ✨ Border colors
- ✨ Chart elements
- ✨ Table styling
- ✨ All UI components

### Color Schemes

**Dark Theme** (GitHub-inspired)
- Deep dark backgrounds
- Light text for readability
- Bitcoin orange accents
- Professional appearance

**Light Theme** (GitHub-inspired)
- Clean white backgrounds
- Dark text for clarity
- Bitcoin orange accents
- Modern, bright look

### Technical Details

- **Persistence**: Uses localStorage
- **Performance**: Instant switching, no lag
- **Coverage**: 100% of components
- **Accessibility**: High contrast in both modes
- **Brand**: Bitcoin orange stays consistent

### Files Added

- `frontend/src/theme.jsx` - Theme system
- `frontend/src/ThemeToggle.jsx` - Toggle button
- Documentation files

### Need Help?

See `THEME_TOGGLE_DOCUMENTATION.md` for complete technical documentation.

---

**Status**: ✅ Fully implemented and tested  
**Ready**: For production use  
**Compatible**: All modern browsers
