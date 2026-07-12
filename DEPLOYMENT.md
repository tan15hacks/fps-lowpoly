# GitHub Pages deployment

The browser and PWA build is deployed by `.github/workflows/deploy-pages.yml`.

Production URL: https://tan15hacks.github.io/fps-lowpoly/

Every push to `main` runs type checking, linting, automated tests, the Vite production build, artifact upload, and GitHub Pages deployment. The workflow reports its result as the `github-pages/deploy` commit status.
