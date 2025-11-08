import React, { useState } from 'react';
import { CanvasElement } from '../types';

interface PropertiesPanelProps {
  elements: CanvasElement[];
  onUpdateElement: (updates: Partial<CanvasElement>) => void;
  onDeleteElement: () => void;
  pixelsPerCm: number;
  theme: 'light' | 'dark';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface ColorPickerProps {
  currentColor: string;
  onColorSelect: (color: string) => void;
  showTransparent?: boolean;
  theme: 'light' | 'dark';
  label: string;
}

const PRESET_COLORS: string[] = [
  '#000000', '#FFFFFF', '#808080', '#C0C0C0',
  '#FF0000', '#FF6B6B', '#FFA07A', '#FFB347',
  '#FFD700', '#FFFF00', '#90EE90', '#00FF00',
  '#00CED1', '#00BFFF', '#4169E1', '#0000FF',
  '#9370DB', '#BA55D3', '#FF69B4', '#DC143C',
  '#8B4513', '#CD853F', '#A0522D', '#654321',
];

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  step?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}

const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, step, min, max, placeholder }) => {
  const [editValue, setEditValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = () => {
    setEditValue(value.toString());
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue('');
    }
  };

  return (
    <input
      type="text"
      value={isEditing ? editValue : value.toFixed(1)}
      onChange={(e) => setEditValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
    />
  );
};

const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor, onColorSelect, showTransparent = false, theme, label }) => {
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [rgbInput, setRgbInput] = useState<{ r: number; g: number; b: number }>({ r: 0, g: 0, b: 0 });

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    if (hex === 'transparent') return { r: 255, g: 255, b: 255 };
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 };
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  React.useEffect(() => {
    if (currentColor && currentColor !== 'transparent' && currentColor.startsWith('#')) {
      setRgbInput(hexToRgb(currentColor));
    }
  }, [currentColor]);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number): void => {
    const newRgb = { ...rgbInput, [channel]: value };
    setRgbInput(newRgb);
    onColorSelect(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const getColorDisplay = (color: string): { background: string; backgroundSize?: string; backgroundPosition?: string } => {
    if (color === 'transparent') {
      return {
        background: 'white',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { background: color };
  };

  const colorDisplay = getColorDisplay(currentColor);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <label style={{ display: 'block', marginBottom: '4px' }}>{label}</label>
      <div
        onClick={() => setShowPopup(!showPopup)}
        style={{
          width: '100%',
          height: '32px',
          border: '2px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          position: 'relative',
          ...colorDisplay,
        }}
        title="Click to open color picker"
      >
        {currentColor === 'transparent' && (
          <svg
            width="100%"
            height="32"
            viewBox="0 0 100 32"
            style={{ position: 'absolute', top: 0, left: 0 }}
            preserveAspectRatio="none"
          >
            <line x1="0" y1="32" x2="100" y2="0" stroke="red" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>

      {showPopup && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1000,
            background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            minWidth: '280px',
          }}
        >
          <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '14px' }}>
            Color Picker
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '4px',
              marginBottom: '12px',
            }}
          >
            {showTransparent && (
              <button
                onClick={() => {
                  onColorSelect('transparent');
                  setShowPopup(false);
                }}
                title="Transparent"
                style={{
                  width: '28px',
                  height: '28px',
                  border: currentColor === 'transparent' ? '2px solid #00aaff' : '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: 'white',
                  padding: 0,
                  position: 'relative',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  <line x1="0" y1="28" x2="28" y2="0" stroke="red" strokeWidth="2" />
                </svg>
              </button>
            )}
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onColorSelect(color);
                  setShowPopup(false);
                }}
                title={color}
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: color,
                  border: currentColor.toLowerCase() === color.toLowerCase() ? '2px solid #00aaff' : '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Color Map
            </label>
            <input
              type="color"
              value={currentColor === 'transparent' ? '#ffffff' : (currentColor.startsWith('#') ? currentColor.substring(0, 7) : currentColor)}
              onChange={(e) => {
                onColorSelect(e.target.value);
              }}
              style={{ width: '100%', height: '40px', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
              RGB Coordinates
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>R</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgbInput.r}
                  onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>G</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgbInput.g}
                  onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>B</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgbInput.b}
                  onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '4px' }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPopup(false)}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '6px',
              background: theme === 'dark' ? '#333' : '#f0f0f0',
              border: `1px solid ${theme === 'dark' ? '#555' : '#ccc'}`,
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  elements,
  onUpdateElement,
  onDeleteElement,
  pixelsPerCm,
  theme,
  isCollapsed,
  onToggleCollapse,
}) => {

  if (elements.length === 0) {
    return (
      <div className={`properties-panel ${theme} ${isCollapsed ? 'collapsed' : ''}`}>
        <button className="collapse-handle" onClick={onToggleCollapse} title={isCollapsed ? 'Expand panel' : 'Collapse panel'}>
          {isCollapsed ? '◀' : '▶'}
        </button>
        {!isCollapsed && (
          <>
            <h3>Properties</h3>
            <p className="no-selection">No element selected</p>
          </>
        )}
      </div>
    );
  }

  if (elements.length === 1) {
    const element = elements[0];
    return (
      <div className={`properties-panel ${theme} ${isCollapsed ? 'collapsed' : ''}`}>
        <button className="collapse-handle" onClick={onToggleCollapse} title={isCollapsed ? 'Expand panel' : 'Collapse panel'}>
          {isCollapsed ? '◀' : '▶'}
        </button>
        {!isCollapsed && (
          <>
            <h3>Properties</h3>

        <div className="property-group">
          <label>X Position (cm)</label>
          <NumericInput
            value={element.x / pixelsPerCm}
            onChange={(xCm) => onUpdateElement({ x: xCm * pixelsPerCm })}
            step="0.1"
          />
        </div>

        <div className="property-group">
          <label>Y Position (cm)</label>
          <NumericInput
            value={element.y / pixelsPerCm}
            onChange={(yCm) => onUpdateElement({ y: yCm * pixelsPerCm })}
            step="0.1"
          />
        </div>

        {element.type === 'line' && (
          <>
            <div className="property-group">
              <label>End X (cm)</label>
              <NumericInput
                value={element.endX / pixelsPerCm}
                onChange={(endXCm) => onUpdateElement({ endX: endXCm * pixelsPerCm })}
                step="0.1"
              />
            </div>

            <div className="property-group">
              <label>End Y (cm)</label>
              <NumericInput
                value={element.endY / pixelsPerCm}
                onChange={(endYCm) => onUpdateElement({ endY: endYCm * pixelsPerCm })}
                step="0.1"
              />
            </div>

            <div className="property-group">
              <label>Length</label>
              <div className="property-value">{element.lengthCm.toFixed(2)} cm</div>
            </div>
          </>
        )}

        {element.type === 'rectangle' && (
          <>
            <div className="property-group">
              <label>Width (cm)</label>
              <NumericInput
                value={element.widthCm}
                onChange={(widthCm) => onUpdateElement({ width: widthCm * pixelsPerCm })}
                step="0.1"
              />
            </div>

            <div className="property-group">
              <label>Height (cm)</label>
              <NumericInput
                value={element.heightCm}
                onChange={(heightCm) => onUpdateElement({ height: heightCm * pixelsPerCm })}
                step="0.1"
              />
            </div>
          </>
        )}

        {element.type === 'door' && (
          <div className="property-group">
            <label>Size (cm)</label>
            <NumericInput
              value={element.width / pixelsPerCm}
              onChange={(sizeCm) => onUpdateElement({ width: sizeCm * pixelsPerCm })}
              step="0.1"
            />
          </div>
        )}

        {element.type === 'circle' && (
          <div className="property-group">
            <label>Radius (cm)</label>
            <NumericInput
              value={element.radius / pixelsPerCm}
              onChange={(radiusCm) => onUpdateElement({ radius: radiusCm * pixelsPerCm })}
              step="0.1"
            />
          </div>
        )}

        <div className="property-group" style={{ display: 'flex', gap: '8px' }}>
          <ColorPicker
            label="Border Color"
            currentColor={element.color}
            onColorSelect={(color) => onUpdateElement({ color })}
            showTransparent={false}
            theme={theme}
          />

          <ColorPicker
            label="Fill Color"
            currentColor={element.fillColor}
            onColorSelect={(color) => onUpdateElement({
              fillColor: color,
              opacity: color === 'transparent' ? undefined : (element.opacity || 1)
            })}
            showTransparent={true}
            theme={theme}
          />
        </div>

        {element.fillColor !== 'transparent' && (
          <div className="property-group">
            <label>Opacity</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={element.opacity !== undefined ? element.opacity : 1}
                onChange={(e) => onUpdateElement({ opacity: parseFloat(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '12px', minWidth: '35px' }}>
                {Math.round((element.opacity !== undefined ? element.opacity : 1) * 100)}%
              </span>
            </div>
          </div>
        )}

        <div className="property-group">
          <label>Stroke Width</label>
          <input
            type="number"
            min="1"
            max="20"
            value={element.strokeWidth}
            onChange={(e) => onUpdateElement({ strokeWidth: parseFloat(e.target.value) })}
          />
        </div>

        {element.type !== 'text' && (
          <div className="property-group">
            <label>Label Text</label>
            <input
              type="text"
              value={element.text || ''}
              onChange={(e) => onUpdateElement({ text: e.target.value })}
              placeholder="Add label..."
            />
          </div>
        )}

        {(element.type === 'rectangle' || element.type === 'text') && (
          <div className="property-group">
            <label>Rotation (degrees)</label>
            <NumericInput
              value={(element.rotation || 0) * 180 / Math.PI}
              onChange={(degrees) => onUpdateElement({ rotation: degrees * Math.PI / 180 })}
              step="1"
            />
          </div>
        )}

        {(element.type === 'line' || element.type === 'rectangle') && (
          <div className="property-group">
            <label>
              <input
                type="checkbox"
                checked={element.hideDimensions || false}
                onChange={(e) => onUpdateElement({ hideDimensions: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Hide Dimensions
            </label>
          </div>
        )}

        {element.type === 'text' && (
          <>
            <div className="property-group">
              <label>Content</label>
              <textarea
                value={element.content}
                onChange={(e) => onUpdateElement({ content: e.target.value })}
                rows={3}
              />
            </div>

            <div className="property-group">
              <label>Font Size</label>
              <input
                type="number"
                min="8"
                max="72"
                value={element.fontSize}
                onChange={(e) => onUpdateElement({ fontSize: parseFloat(e.target.value) })}
              />
            </div>

            <div className="property-group">
              <label>Font Family</label>
              <select
                value={element.fontFamily}
                onChange={(e) => onUpdateElement({ fontFamily: e.target.value })}
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>
          </>
        )}

        {element.type === 'door' && (
          <div className="property-group">
            <label>Wall Rotation (degrees)</label>
            <NumericInput
              value={(element.rotation || 0) * 180 / Math.PI}
              onChange={(degrees) => onUpdateElement({ rotation: degrees * Math.PI / 180 })}
              step="1"
            />
          </div>
        )}

        {element.type === 'circle' && (
          <div className="property-group">
            <label>
              <input
                type="checkbox"
                checked={element.hideDimensions || false}
                onChange={(e) => onUpdateElement({ hideDimensions: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Hide Dimensions
            </label>
          </div>
        )}

        <div className="property-group">
          <label>
            <input
              type="checkbox"
              checked={element.locked || false}
              onChange={(e) => onUpdateElement({ locked: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            Lock Element
          </label>
        </div>

        <button className="delete-button-panel" onClick={onDeleteElement}>
          Delete Element
        </button>
          </>
        )}
      </div>
    );
  }

  const commonColor = elements.every(e => e.color === elements[0].color) ? elements[0].color : '';
  const commonFillColor = elements.every(e => e.fillColor === elements[0].fillColor) ? elements[0].fillColor : '';
  const commonOpacity = elements.every(e => (e.opacity || 1) === (elements[0].opacity || 1)) ? (elements[0].opacity || 1) : undefined;
  const commonStrokeWidth = elements.every(e => e.strokeWidth === elements[0].strokeWidth) ? elements[0].strokeWidth : '';
  const commonLocked = elements.every(e => (e.locked || false) === (elements[0].locked || false)) ? (elements[0].locked || false) : undefined;

  return (
    <div className={`properties-panel ${theme} ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="collapse-handle" onClick={onToggleCollapse} title={isCollapsed ? 'Expand panel' : 'Collapse panel'}>
        {isCollapsed ? '◀' : '▶'}
      </button>
      {!isCollapsed && (
        <>
          <h3>Properties</h3>
      <div className="property-group">
        <label>Selection</label>
        <div className="property-value">{elements.length} elements selected</div>
      </div>

      <div className="property-group" style={{ display: 'flex', gap: '8px' }}>
        <ColorPicker
          label="Border Color"
          currentColor={commonColor || '#ffffff'}
          onColorSelect={(color) => onUpdateElement({ color })}
          showTransparent={false}
          theme={theme}
        />

        <ColorPicker
          label="Fill Color"
          currentColor={commonFillColor || '#ffffff'}
          onColorSelect={(color) => onUpdateElement({
            fillColor: color,
            opacity: color === 'transparent' ? undefined : (commonOpacity || 1)
          })}
          showTransparent={true}
          theme={theme}
        />
      </div>

      {commonFillColor !== 'transparent' && (
        <div className="property-group">
          <label>Opacity</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={commonOpacity !== undefined ? commonOpacity : 1}
              onChange={(e) => onUpdateElement({ opacity: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '12px', minWidth: '35px' }}>
              {commonOpacity !== undefined ? Math.round(commonOpacity * 100) : '—'}%
            </span>
          </div>
        </div>
      )}

      <div className="property-group">
        <label>Stroke Width</label>
        <input
          type="number"
          min="1"
          max="20"
          value={commonStrokeWidth}
          placeholder="Mixed"
          onChange={(e) => onUpdateElement({ strokeWidth: parseFloat(e.target.value) })}
        />
      </div>

      <div className="property-group">
        <label>
          <input
            type="checkbox"
            checked={commonLocked !== undefined ? commonLocked : false}
            onChange={(e) => onUpdateElement({ locked: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Lock Elements {commonLocked === undefined ? '(Mixed)' : ''}
        </label>
      </div>

      <button className="delete-button-panel" onClick={onDeleteElement}>
        Delete {elements.length} Elements
      </button>
        </>
      )}
    </div>
  );
};
