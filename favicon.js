const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="8" fill="#8e44ad"/>
  <text x="32" y="42" font-family="Arial" font-size="40" fill="white" text-anchor="middle">{}</text>
</svg>
`;

const canvas = document.createElement('canvas');
canvas.width = 64;
canvas.height = 64;
const ctx = canvas.getContext('2d');

const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0);
  const favicon = document.querySelector('link[rel="icon"]');
  favicon.href = canvas.toDataURL('image/png');
};
img.src = 'data:image/svg+xml;base64,' + btoa(svgContent);