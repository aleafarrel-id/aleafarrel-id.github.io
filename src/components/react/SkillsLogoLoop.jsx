import LogoLoop from './LogoLoop';
import { FaHtml5, FaCss3Alt } from 'react-icons/fa6';
import { SiJavascript, SiTailwindcss, SiPhp, SiGit, SiMysql, SiCplusplus, SiReact, SiPython, SiNodedotjs, SiAstro, SiGnubash } from 'react-icons/si';

const techLogos = [
  { node: <FaHtml5 />, title: "HTML5", href: "https://developer.mozilla.org/en-US/docs/Glossary/HTML5" },
  { node: <FaCss3Alt />, title: "CSS3", href: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
  { node: <SiJavascript />, title: "JavaScript", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
  { node: <SiReact />, title: "React", href: "https://react.dev" },
  { node: <SiAstro />, title: "Astro", href: "https://astro.build" },
  { node: <SiTailwindcss />, title: "Tailwind CSS", href: "https://tailwindcss.com" },
  { node: <SiNodedotjs />, title: "Node.js", href: "https://nodejs.org" },
  { node: <SiPython />, title: "Python", href: "https://www.python.org" },
  { node: <SiCplusplus />, title: "C++", href: "https://isocpp.org" },
  { node: <SiPhp />, title: "PHP", href: "https://www.php.net" },
  { node: <SiMysql />, title: "MySQL", href: "https://www.mysql.com" },
  { node: <SiGnubash />, title: "Bash", href: "https://www.gnu.org/software/bash/" },
  { node: <SiGit />, title: "Git", href: "https://git-scm.com" },
];

export default function SkillsLogoLoop() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <LogoLoop
        logos={techLogos}
        speed={60}
        direction="left"
        hoverSpeed={0}
        scaleOnHover={true}
        fadeOut={true}
        ariaLabel="Skills and Technologies"
      />
    </div>
  );
}
