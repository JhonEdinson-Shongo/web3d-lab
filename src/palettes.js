// Paletas del fondo (aurora + partículas).
// Cada tema tiene 5 colores; cada sección usa 3 de ellos rotando el orden, así el fondo
function theme(name, colors, { accent, material = colors[1], intensity = 0.35 }) {
  const trio = (i) => [0, 1, 2].map((k) => colors[(i + k) % colors.length]);
  return {
    name,
    sections: [trio(0), trio(1), trio(2), null, trio(3)],
    material,
    accent,
    intensity,
  };
}

export const THEMES = [
  theme('Shongo sobrio', ['#10b981', '#0b3d2e', '#0f766e', '#134e4a', '#059669'], { accent: '#10b981', intensity: 0.3 }),
  theme('Turquesa y coral', ['#14b8a6', '#fb7185', '#0f766e', '#f43f5e', '#2dd4bf'], { accent: '#fda4af', intensity: 0.3 }),
  theme('Salvia', ['#6b8f71', '#a3b18a', '#588157', '#dad7cd', '#3a5a40'], { accent: '#a3b18a', intensity: 0.42 }),
  theme('Carbón y brasa', ['#1f2937', '#111827', '#ea580c', '#1f2937', '#374151'], { accent: '#fb923c', material: '#374151', intensity: 0.55 }),
  theme('Abismo', ['#0f172a', '#1e1b4b', '#0ea5e9', '#172554', '#0c4a6e'], { accent: '#38bdf8', material: '#1e1b4b', intensity: 0.55 }),
];
