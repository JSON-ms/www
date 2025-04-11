import { type Plugin } from 'vite';
import postcss, { Root } from 'postcss';

export default function vuetifyRemPlugin(): Plugin {
  return {
    name: 'vite-vuetify-to-rem',
    transform(code: string, id: string) {

      // Only process Vuetify .sass files
      if (!id.includes('vuetify')) return;

      if (id.includes('.sass')) {
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
          .process(code, { from: id })
          .then((result) => {
            return {
              code: result.css,
              // map: result.map, // Optional: if you want to include source maps
            };
          });
      }

      /**
       * I really tried but I faced issues with imports of convertToUnit in templates
       * and code being compiled not really accessible as a function name...
       */

      // else if (id.includes('.js') || id.includes('.ts')) {
      //   let transformedCode = code.replace(/convertToUnit[^,]/g, () => {
      //     return `convertToUnitRem(`;
      //   })
      //
      //   transformedCode = `
      //     if (typeof convertToUnitRem !== "function") {
      //       function convertToUnitRem(value, unit = 'px') {
      //         const fromVuetify = convertToUnit(value, unit);
      //         if (unit === 'rem') {
      //           return fromVuetify;
      //         }
      //         const justNumber = parseFloat(fromVuetify);
      //         const remValue = (parseFloat(justNumber) / 16).toFixed(4);
      //         return justNumber + 'rem';
      //       }
      //     }
      //   ` + transformedCode;
      //
      //   return {
      //     code: transformedCode,
      //   };
      // }

      return;
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
