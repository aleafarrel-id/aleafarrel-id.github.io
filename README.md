<div align="center">

  <!-- Main Tech Stack Badges -->
  <img src="https://img.shields.io/badge/Astro-0C0F19?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=white" alt="GSAP" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />

  <br />
  <br />

  <h1 align="center">Immersive Developer Portfolio</h1>

  <p align="center">
    <strong>A highly interactive, performance-focused web portfolio.</strong><br>
    <em>Showcasing skills, projects, and experiences through cutting-edge web technologies, smooth scroll hijacking, and interactive WebGL scenes.</em>
  </p>

  <p align="center">
    <a href="https://aleafarrel-id.github.io/"><strong>View Live Website</strong></a>
  </p>

</div>

---

## About The Project

This repository contains the source code for my personal Developer Portfolio. It is designed to be more than just a static site—it is an interactive experience. By combining the blazing-fast performance of **Astro**, the component-driven power of **React**, and immersive visual capabilities of **Three.js (React Three Fiber)**, this portfolio sets a new standard for creative web development.

### Key Highlights

*   **Immersive Visuals**: Interactive WebGL elements rendered in real-time, responding to scroll events and mouse interactions to create a deeply engaging atmosphere.
*   **Buttery Smooth Animations**: High-performance orchestrations of timeline animations using **GSAP** and spring-physics interactions using **Framer Motion**.
*   **Fluid Scrolling Experience**: Native-feeling smooth scroll implementation powered by **Lenis**.
*   **Bilingual (i18n)**: Seamless language switching between English and Indonesian with localized content and routing.
*   **Fully Responsive**: Meticulously crafted with **Tailwind CSS v4** to ensure pixel-perfect rendering across mobile, tablet, and ultra-wide displays.
*   **Zero-JS by Default**: Leveraging Astro's Islands Architecture to ship minimal JavaScript, resulting in incredibly fast load times.

---

## Tech Stack Architecture

The application is built on a modern frontend stack chosen for maximum performance and developer experience.

| Category | Technologies | Description |
| :--- | :--- | :--- |
| **Core Framework** | `Astro`, `React` | Astro acts as the SSG (Static Site Generator) host, hydrating React components only when necessary. |
| **Visual Rendering** | `Three.js`, `@react-three/fiber`, `@react-three/drei` | WebGL ecosystem for rendering complex graphical scenes declaratively inside React. |
| **Styling** | `Tailwind CSS v4`, `clsx`, `tailwind-merge` | Utility-first CSS framework for rapid UI development and dynamic class merging. |
| **Animation & Motion** | `Framer Motion`, `GSAP` | Framer Motion handles UI interaction states; GSAP controls complex, scroll-linked timeline sequences. |
| **Scroll Control** | `Lenis` | A lightweight smooth scroll library that plays perfectly with WebGL and GSAP ScrollTrigger. |
| **Deployment** | `GitHub Actions`, `GitHub Pages` | Fully automated CI/CD pipeline building and deploying the static artifacts. |

---

## Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites

Ensure you have a recent version of Node.js installed.
*   **Node.js**: `>= 22.12.0`
*   **npm**: Included with Node.js

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/aleafarrel-id/aleafarrel-id.github.io.git
    ```
2.  **Navigate to the project directory**
    ```bash
    cd aleafarrel-id.github.io
    ```
3.  **Install the dependencies**
    ```bash
    npm install
    ```

### Local Development

Start the development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

> **Note**: Open your browser and navigate to `http://localhost:4321`.

### Production Build

To build the static site for production deployment:

```bash
npm run build
```
The optimized files will be generated in the `./dist` folder. You can preview them locally using `npm run preview`.

---

<div align="center">
  <p>Built with dedication and precision by Alea Farrel</p>
</div>
