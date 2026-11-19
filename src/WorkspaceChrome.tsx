import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowRight, Briefcase, ChevronRight, ClipboardList, Download, Layers, LayoutDashboard, Menu, Receipt, Settings, TrendingUp, Upload, X } from 'lucide-react';
import { Appearance } from './Appearance';

const sourceUrl = 'https://github.com/pthomps3/margindesk-open';
const groups = [
  {label: 'Workspace', pages: [['Overview', LayoutDashboard]]},
  {label: 'Record', pages: [['Jobs', Briefcase], ['Estimates', ClipboardList], ['Expenses', Receipt], ['Services', Layers]]},
  {label: 'Analyze', pages: [['Reports', Download], ['Forecast', TrendingUp]]},
  {label: 'Manage', pages: [['Import', Upload], ['Settings', Settings]]},
] as const;
type Navigate = (page: string) => void;
type NavigationProps = {page: string; navigate: Navigate};

export function pageLabel(page: string, businessType?: string) {
  if (page === 'Jobs') return 'Sales & work';
  if (page === 'Services') return businessType === 'retail' ? 'Products' : 'Services & products';
  return page;
}

function RouteLink({to, navigate, children, current, className}: {
  to: string; navigate: Navigate; children: ReactNode; current?: boolean; className?: string;
}) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return <a href={'#' + encodeURIComponent(to)} className={className} onClick={follow} aria-current={current ? 'page' : undefined}>{children}</a>;
}

function Brand({to, navigate}: {to: string; navigate: Navigate}) {
  return <RouteLink to={to} navigate={navigate} className="brand" >
    <span className="logo" aria-hidden="true">m<span>↗</span></span>MyMarginDesk
  </RouteLink>;
}

function Skip() {
  return <a className="md-skip" href="#md-main" onClick={event => {
    event.preventDefault();
    document.getElementById('md-main')?.focus();
  }}>Skip to content</a>;
}

export function PublicSite({page, navigate, hosted, enter, children}: NavigationProps & {
  hosted?: boolean; enter: () => void; children: ReactNode;
}) {
  const pages = hosted ? ['Calculator', 'Pricing', 'FAQ', 'Sign in'] : ['Calculator', 'FAQ'];
  return <div className="public md-public">
    <Skip/>
    <header className="publicnav">
      <Brand to="Home" navigate={navigate}/>
      <nav aria-label="Main navigation">
        {pages.map(link => <RouteLink key={link} to={link} navigate={navigate} current={page === link}>{link}</RouteLink>)}
        <a href={sourceUrl}>Open Source</a>
      </nav>
      <div className="md-public-actions">
        <Appearance/>
        <button type="button" className="primary" onClick={enter}>{hosted ? 'Try the demo' : 'Open workspace'} <ArrowRight size={16} aria-hidden="true"/></button>
      </div>
    </header>
    <main key={page} id="md-main" tabIndex={-1}><div className="content">{children}</div></main>
  </div>;
}

export function WorkspaceShell({page, navigate, name, businessType, status, estimates, extraLinks, children}: NavigationProps & {
  name: string; businessType?: string; status: string; estimates?: boolean; extraLinks?: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousPage = useRef(page);
  const main = useRef<HTMLElement>(null);
  const label = pageLabel(page, businessType);
  useEffect(() => {
    if (previousPage.current !== page) {
      previousPage.current = page;
      setOpen(false);
      main.current?.focus({preventScroll: true});
    }
  }, [page]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  const follow = (next: string) => {
    setOpen(false);
    if (next === page) main.current?.focus({preventScroll: true});
    navigate(next);
  };
  return <div className="shell md-shell">
    <Skip/>
    <header className="topbar md-topbar">
      <button ref={trigger} type="button" className="md-menu" aria-controls="md-workspace-nav" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        {open ? <X size={18} aria-hidden="true"/> : <Menu size={18} aria-hidden="true"/>} Menu
      </button>
      <span className="md-location"><span>Workspace</span><ChevronRight size={13} aria-hidden="true"/><b>{label}</b></span>
      <div className="md-top-actions"><span className="md-account-state">{status}</span><Appearance/></div>
    </header>
    <aside className={open ? 'md-rail open' : 'md-rail'} id="md-workspace-nav">
      <Brand to="Overview" navigate={follow}/>
      <RouteLink to="Settings" navigate={follow} className="md-business">
        <span className="avatar" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase()}</span>
        <strong>{name}</strong><ChevronRight size={15} aria-hidden="true"/>
      </RouteLink>
      <nav aria-label="Workspace navigation">
        {groups.map(group => <div className="md-nav-group" key={group.label}>
          <p>{group.label}</p>
          <ul>{group.pages.filter(([item]) => item !== 'Estimates' || estimates).map(([item, Icon]) => <li key={item}>
            <RouteLink to={item} navigate={follow} current={page === item}><Icon size={18} aria-hidden="true"/>{pageLabel(item, businessType)}</RouteLink>
          </li>)}</ul>
        </div>)}
      </nav>
      <div className="md-side-links">
        {extraLinks}
        <RouteLink to="Home" navigate={follow}>Website home</RouteLink>
        <a href={sourceUrl}>Open Source</a>
      </div>
    </aside>
    <main ref={main} id="md-main" tabIndex={-1}><div className="content">{children}</div></main>
  </div>;
}

export function PageHead({title, text, children}: {title: string; text: string; children?: ReactNode}) {
  return <div className="heading md-page-head"><div><h1>{title}</h1><p>{text}</p></div>{children}</div>;
}
