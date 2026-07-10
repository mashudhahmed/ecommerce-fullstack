// src/types/css.d.ts
// This file provides TypeScript declarations for CSS modules and global CSS imports

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.sass' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.less' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
}

// ✅ For global CSS imports (like globals.css)
declare module '*.css' {
  const styles: any;
  export default styles;
}

// ✅ For CSS-in-JS or other styles
declare module '*.css' {
  const styles: any;
  export default styles;
}