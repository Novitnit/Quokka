import { defineConfig } from 'tsup';

export default defineConfig({
    format: ['cjs', 'esm'],
    entry: ['src/**/*.ts', 'src/*.ts'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: true,
    outDir: 'dist',
    target: 'es2020',
}); 