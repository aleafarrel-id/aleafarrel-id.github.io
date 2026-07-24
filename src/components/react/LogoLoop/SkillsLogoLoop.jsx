import LogoLoop from './LogoLoop';
import { FaHtml5, FaCss3Alt } from 'react-icons/fa6';
import {
  SiJavascript,
  SiTailwindcss,
  SiPhp,
  SiGit,
  SiMysql,
  SiCplusplus,
  SiReact,
  SiPython,
  SiNodedotjs,
  SiAstro,
  SiGnubash,
  SiCapacitor,
} from 'react-icons/si';
import siteConfig from '../../../siteConfig.json';

/**
 * Map of icon key strings (from siteConfig.json) to React icon elements.
 * To add a new icon: install it from react-icons, import it above,
 * and add an entry here matching the "icon" key in siteConfig.json.
 */
const ICON_MAP = {
  FaHtml5:      <FaHtml5 />,
  FaCss3Alt:    <FaCss3Alt />,
  SiJavascript: <SiJavascript />,
  SiReact:      <SiReact />,
  SiAstro:      <SiAstro />,
  SiTailwindcss:<SiTailwindcss />,
  SiNodedotjs:  <SiNodedotjs />,
  SiPython:     <SiPython />,
  SiCplusplus:  <SiCplusplus />,
  SiPhp:        <SiPhp />,
  SiMysql:      <SiMysql />,
  SiGnubash:    <SiGnubash />,
  SiGit:        <SiGit />,
  SiCapacitor:  <SiCapacitor />,
};

/**
 * Derived from siteConfig.json → skills[].
 * To add/remove a skill, edit src/siteConfig.json — no JSX changes needed.
 */
const techLogos = siteConfig.skills.map((skill) => ({
  node: ICON_MAP[skill.icon] ?? null,
  title: skill.name,
  href: skill.href,
}));

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
