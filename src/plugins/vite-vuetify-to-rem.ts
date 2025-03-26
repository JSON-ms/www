import { type Plugin } from 'vite';
import postcss, { Root } from 'postcss';

export default function vuetifyRemPlugin(): Plugin {
  return {
    name: 'vite-vuetify-to-rem',
    transform(css: string, id: string) {

      // Only process Vuetify .sass files
      if (!id.startsWith('virtual:plugin-vuetify:components') && !id.includes('.sass')) return;

      return postcss([
        // Your PostCSS plugin will go here
        (root: Root) => {
          root.walkDecls((decl) => {
            if (decl.value.includes('px')) {
              decl.value = convertPxToRem(decl.value);
            }
          });
        },
      ])
        .process(css, { from: id })
        .then((result) => {
          return {
            code: result.css,
            // map: result.map, // Optional: if you want to include source maps
          };
        });
    },
  };
}

// Function to convert px to rem
function convertPxToRem(value: string): string {
  return value.replace(/(\d*\.?\d+)px/g, (match, p1) => {
    const remValue = (parseFloat(p1) / 16).toFixed(4); // Convert px to rem
    return `${remValue}rem`;
  });
}
