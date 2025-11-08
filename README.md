# 2D Room Planner

A web-based 2D room planning application built with React and TypeScript. Design floor plans by drawing lines, rectangles, and adding text annotations with automatic distance measurements in centimeters.

## Features

### Project Management
- Create and manage multiple projects
- Each project shows name, creation date, and last updated time
- Automatic save to browser's local storage
- Export/import projects as JSON files
- Automatically loads last opened project on startup

### Canvas Drawing Tools
- **Select Tool**: Click elements to select and edit their properties
- **Line Tool**: Draw lines with automatic length calculation in cm
- **Rectangle Tool**: Draw rectangles with width and height measurements in cm
- **Text Tool**: Add text annotations anywhere on the canvas

### Canvas Navigation
- **Zoom**: Use mouse wheel to zoom in/out
- **Pan**: Hold Alt/Option + left click and drag, or use middle mouse button
- Grid background for precise alignment

### Properties Panel
- Edit selected element properties in real-time
- Modify position (X, Y coordinates)
- Change colors
- Adjust stroke width
- Element-specific properties:
  - **Lines**: Edit endpoints, view length
  - **Rectangles**: Resize dimensions, view measurements
  - **Text**: Edit content, font size, and font family
- Delete selected elements

### Theme Support
- Light and dark mode themes
- Theme preference saved between sessions
- Toggle button in top-right corner

### Data Persistence
- All changes auto-saved to browser's local storage
- Export projects to JSON files
- Import previously exported projects
- No server required - all data stored locally

## Installation

```bash
npm install
```

## Usage

### Development Mode
```bash
make dev
# or
make start
# or
npm run dev
```

The application will open at `http://localhost:5173` (or next available port)

### Build for Production
```bash
make build
# or
npm run build
```

### Preview Production Build
```bash
make preview
# or
npm run preview
```

## How to Use

1. **Create a Project**: Click "New Project" button on the home screen
2. **Select a Tool**: Choose from Select, Line, Rectangle, or Text tools
3. **Draw Elements**:
   - **Line**: Click and drag to draw
   - **Rectangle**: Click and drag to create
   - **Text**: Click to place text box
4. **Edit Elements**:
   - Click the Select tool
   - Click any element to select it
   - Modify properties in the right panel
5. **Navigate Canvas**:
   - Zoom with mouse wheel
   - Pan by holding Alt and dragging
6. **Export/Import**: Use buttons in toolbar to save or load project JSON files
7. **Switch Theme**: Click the theme toggle button (☀️/🌙) in top-right corner

## Technical Details

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Canvas Rendering**: HTML5 Canvas API
- **Storage**: Browser LocalStorage API
- **Measurements**: Configurable pixels-per-cm ratio (default: 10px = 1cm)

## Project Structure

```
src/
├── components/
│   ├── ProjectListView.tsx    # Project selection screen
│   ├── CanvasView.tsx          # Main drawing canvas
│   └── PropertiesPanel.tsx    # Element properties editor
├── types.ts                    # TypeScript type definitions
├── storageService.ts           # LocalStorage management
├── App.tsx                     # Main application component
├── App.css                     # Application styles
└── main.tsx                    # Application entry point
```

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- LocalStorage API
- ES2020+ JavaScript features

## License

MIT
