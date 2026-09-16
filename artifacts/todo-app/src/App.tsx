import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarDays, Check, ChevronDown, CircleHelp, ClipboardList, Clock3, Menu, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const STORAGE_KEY = 'quietly-todos-v1';

type Priority = 'low' | 'medium' | 'high';
type Filter = 'all' | 'today' | 'upcoming' | 'completed';
type Task = {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate: string;
  createdAt: string;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const offsetDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
};

const starterTasks: Task[] = [
  { id: 'starter-1', text: 'Write down the one thing that would make today feel lighter', completed: false, priority: 'high', dueDate: formatDateInput(new Date()), createdAt: new Date().toISOString() },
  { id: 'starter-2', text: 'Take a proper break before the afternoon gets away', completed: false, priority: 'low', dueDate: formatDateInput(new Date()), createdAt: new Date().toISOString() },
  { id: 'starter-3', text: 'Make space for the idea I keep circling back to', completed: false, priority: 'medium', dueDate: offsetDate(2), createdAt: new Date().toISOString() },
];

function loadTasks(): Task[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return starterTasks;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : starterTasks;
  } catch {
    return starterTasks;
  }
}

const displayDate = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const longToday = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const isToday = (value: string) => value === formatDateInput(new Date());
const isPast = (value: string) => value !== '' && value < formatDateInput(new Date());

const priorityLabels: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function AppShell({ children }: { children: ReactNode }) {
  return <div className="grain min-h-[100dvh] bg-background text-foreground">{children}</div>;
}

function Home() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const openCount = tasks.length - completedCount;
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !query || task.text.toLowerCase().includes(query);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'today' && !task.completed && isToday(task.dueDate)) ||
        (filter === 'upcoming' && !task.completed && task.dueDate > formatDateInput(new Date())) ||
        (filter === 'completed' && task.completed);
      return matchesSearch && matchesFilter;
    });
  }, [filter, search, tasks]);

  const addTask = (text: string, priority: Priority, dueDate: string) => {
    const task: Task = { id: crypto.randomUUID(), text: text.trim(), completed: false, priority, dueDate, createdAt: new Date().toISOString() };
    setTasks((current) => [task, ...current]);
    setIsComposerOpen(false);
    setToast('A clear next step, added.');
  };

  const updateTask = (id: string, changes: Partial<Task>) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...changes } : task));
  };

  const toggleTask = (task: Task) => {
    updateTask(task.id, { completed: !task.completed });
    setToast(task.completed ? 'Back on your list.' : 'Nice. That is one less thing to carry.');
  };

  const deleteTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
    setToast('Removed from your list.');
  };

  const clearCompleted = () => {
    if (!completedCount) return;
    setTasks((current) => current.filter((task) => !task.completed));
    setToast(`${completedCount} ${completedCount === 1 ? 'task' : 'tasks'} cleared.`);
  };

  const navigateFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    setMobileNavOpen(false);
  };

  return (
    <AppShell>
      <div className="flex min-h-[100dvh]">
        <aside className={`fixed inset-y-0 left-0 z-30 flex w-[278px] flex-col bg-sidebar px-6 py-7 text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Main navigation">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-accent-foreground shadow-[0_8px_20px_hsl(13_72%_67%_/_0.22)]"><Sparkles size={19} strokeWidth={2.3} /></div>
            <div>
              <div className="font-serif text-[23px] leading-none tracking-[-0.03em]">quietly</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.19em] text-sidebar-foreground/55">a little room to think</div>
            </div>
          </div>

          <div className="mt-14">
            <p className="mb-3 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/42">Your list</p>
            <nav className="space-y-1" aria-label="Task filters">
              <SidebarItem icon={<ClipboardList size={17} />} label="All tasks" count={openCount} active={filter === 'all'} onClick={() => navigateFilter('all')} testId="nav-all-tasks" />
              <SidebarItem icon={<CalendarDays size={17} />} label="Today" count={tasks.filter((task) => isToday(task.dueDate) && !task.completed).length} active={filter === 'today'} onClick={() => navigateFilter('today')} testId="nav-today" />
              <SidebarItem icon={<Clock3 size={17} />} label="Upcoming" count={tasks.filter((task) => task.dueDate > formatDateInput(new Date()) && !task.completed).length} active={filter === 'upcoming'} onClick={() => navigateFilter('upcoming')} testId="nav-upcoming" />
              <SidebarItem icon={<Check size={17} />} label="Completed" count={completedCount} active={filter === 'completed'} onClick={() => navigateFilter('completed')} testId="nav-completed" />
            </nav>
          </div>

          <div className="mt-auto rounded-[18px] border border-sidebar-foreground/10 bg-sidebar-accent/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/55">A small nudge</span>
              <CircleHelp size={14} className="text-sidebar-foreground/45" />
            </div>
            <p className="font-serif text-[17px] leading-[1.18] text-sidebar-foreground/90">You do not have to hold every thought at once.</p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-sidebar-foreground/10">
              <div className="h-full rounded-full bg-accent" style={{ width: `${tasks.length ? Math.max(8, (completedCount / tasks.length) * 100) : 0}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-sidebar-foreground/48">{completedCount ? `${completedCount} done so far` : 'One clear step is enough.'}</p>
          </div>
        </aside>

        {mobileNavOpen && <button className="fixed inset-0 z-20 bg-foreground/25 lg:hidden" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} data-testid="button-close-navigation" />}

        <main className="min-w-0 flex-1">
          <header className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={21} /></button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{longToday()}</p>
                <p className="mt-0.5 text-[12px] text-foreground/60">Make room for what matters</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-serif text-sm text-primary-foreground">m</div>
            </div>
          </header>

          <div className="mx-auto max-w-[1120px] px-5 pb-16 sm:px-8 lg:px-12">
            <section className="relative overflow-hidden rounded-[25px] bg-[#dfe8d8] px-6 py-8 sm:px-10 sm:py-10">
              <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[22px] border-[#f7b19f]/35" />
              <div className="absolute -right-1/2 -bottom-40 h-96 w-96 rounded-full border-[1px] border-primary/10" />
              <div className="relative max-w-[570px]">
                <p className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-accent" />A moment to reset</p>
                <h1 className="font-serif text-[39px] leading-[.98] tracking-[-0.04em] text-[#183c34] sm:text-[52px]">Good morning, Maya<span className="text-accent">.</span></h1>
                <p className="mt-4 max-w-[430px] text-[15px] leading-relaxed text-[#355c51]">Let the list hold the loose ends today. You can just focus on the next one.</p>
                <button onClick={() => setIsComposerOpen(true)} className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[13px] font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(163_38%_36%_/_0.18)] transition-transform hover:-translate-y-0.5 active:translate-y-0" data-testid="button-add-task-hero"><Plus size={16} /> Add a task</button>
              </div>
            </section>

            <section className="mt-10">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-muted-foreground">{filter === 'all' ? 'Your space' : filter === 'today' ? 'For today' : filter === 'upcoming' ? 'On the horizon' : 'A look back'}</p>
                  <h2 className="mt-1 font-serif text-[32px] tracking-[-0.035em]">{filter === 'all' ? 'The next right thing' : filterTitle(filter)}</h2>
                </div>
                <div className="relative w-full sm:w-[230px]">
                  <Search size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a task..." className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-[13px] text-foreground shadow-sm placeholder:text-muted-foreground/65" aria-label="Search tasks" data-testid="input-search-tasks" />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1 overflow-x-auto border-b border-border pb-3 hide-scrollbar">
                {(['all', 'today', 'upcoming', 'completed'] as Filter[]).map((item) => (
                  <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors ${filter === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} data-testid={`filter-${item}`}>{filterLabel(item)}</button>
                ))}
                <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 sm:block">{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}</span>
              </div>

              {isComposerOpen && <TaskComposer onAdd={addTask} onCancel={() => setIsComposerOpen(false)} />}

              <div className="mt-4 space-y-2.5">
                {filteredTasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} onToggle={toggleTask} onUpdate={updateTask} onDelete={deleteTask} />)}
              </div>

              {!filteredTasks.length && <EmptyState filter={filter} search={search} onAdd={() => { setSearch(''); setIsComposerOpen(true); }} />}

              {completedCount > 0 && (
                <button onClick={clearCompleted} className="mt-7 inline-flex items-center gap-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-destructive" data-testid="button-clear-completed"><Trash2 size={14} /> Clear completed ({completedCount})</button>
              )}
            </section>
          </div>
        </main>
      </div>
      {toast && <div role="status" className="toast-enter fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[12px] font-semibold text-background shadow-xl"><Check size={14} className="text-accent" />{toast}</div>}
    </AppShell>
  );
}

function SidebarItem({ icon, label, count, active, onClick, testId }: { icon: ReactNode; label: string; count: number; active: boolean; onClick: () => void; testId: string }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[13px] transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`} data-testid={testId}><span className={active ? 'text-accent' : ''}>{icon}</span><span className="flex-1">{label}</span><span className={`font-mono text-[10px] ${active ? 'text-sidebar-foreground/70' : 'text-sidebar-foreground/35'}`}>{count}</span></button>;
}

function TaskComposer({ onAdd, onCancel }: { onAdd: (text: string, priority: Priority, dueDate: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState(formatDateInput(new Date()));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (text.trim()) onAdd(text, priority, dueDate);
  };
  return <form onSubmit={submit} className="mt-5 rounded-[17px] border border-primary/25 bg-card p-4 shadow-[0_8px_28px_hsl(163_38%_36%_/_0.08)] task-enter" data-testid="form-add-task">
    <div className="flex items-start gap-3"><div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary/45"><Plus size={12} className="text-primary" /></div><input autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder="What is on your mind?" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/65" aria-label="New task text" data-testid="input-new-task" /></div>
    <div className="mt-4 flex flex-wrap items-center gap-2 pl-8">
      <SelectChip label="Priority" value={priorityLabels[priority]}><select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} aria-label="Task priority" data-testid="select-new-priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></SelectChip>
      <label className="relative inline-flex h-8 items-center gap-2 rounded-full border border-border bg-background px-3 text-[11px] text-muted-foreground"><CalendarDays size={13} /><span>{dueDate ? displayDate(dueDate) : 'No date'}</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Task due date" data-testid="input-new-due-date" /></label>
      <div className="ml-auto flex gap-2"><button type="button" onClick={onCancel} className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-muted" data-testid="button-cancel-task">Cancel</button><button type="submit" className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-50" disabled={!text.trim()} data-testid="button-save-task">Save task</button></div>
    </div>
  </form>;
}

function SelectChip({ children, label, value }: { children: ReactNode; label: string; value: string }) {
  return <label className="relative inline-flex h-8 items-center gap-2 rounded-full border border-border bg-background px-3 text-[11px] text-muted-foreground"><span>{label}:</span><strong className="text-foreground">{value}</strong><ChevronDown size={12} /><span className="absolute inset-0 overflow-hidden opacity-0">{children}</span></label>;
}

function TaskRow({ task, index, onToggle, onUpdate, onDelete }: { task: Task; index: number; onToggle: (task: Task) => void; onUpdate: (id: string, changes: Partial<Task>) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [showDetails, setShowDetails] = useState(false);
  const saveEdit = () => {
    if (draft.trim()) onUpdate(task.id, { text: draft.trim() });
    else setDraft(task.text);
    setEditing(false);
  };
  return <article className={`group rounded-[15px] border border-card-border bg-card px-4 py-3.5 shadow-[0_2px_5px_hsl(166_28%_17%_/_0.025)] transition-all hover:border-primary/25 hover:shadow-[0_7px_20px_hsl(166_28%_17%_/_0.06)] task-enter ${task.completed ? 'opacity-65' : ''}`} style={{ animationDelay: `${Math.min(index * 55, 330)}ms` }} data-testid={`task-card-${task.id}`}>
    <div className="flex items-start gap-3">
      <button onClick={() => onToggle(task)} className={`mt-0.5 flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border-2 transition-all ${task.completed ? 'border-primary bg-primary text-primary-foreground check-pop' : 'border-muted-foreground/35 hover:border-primary hover:bg-primary/10'}`} aria-label={task.completed ? `Mark "${task.text}" incomplete` : `Complete "${task.text}"`} data-testid={`button-toggle-task-${task.id}`}>{task.completed && <Check size={13} strokeWidth={3} />}</button>
      <div className="min-w-0 flex-1">
        {editing ? <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={saveEdit} onKeyDown={(event) => { if (event.key === 'Enter') saveEdit(); if (event.key === 'Escape') { setDraft(task.text); setEditing(false); } }} className="w-full border-b border-primary bg-transparent pb-1 text-[14px] leading-snug outline-none" aria-label="Edit task text" data-testid={`input-edit-task-${task.id}`} /> : <button onClick={() => setEditing(true)} className={`block max-w-full text-left text-[14px] leading-snug transition-colors hover:text-primary ${task.completed ? 'text-muted-foreground line-through decoration-primary/60' : 'text-foreground/90'}`} data-testid={`button-edit-task-${task.id}`}>{task.text}</button>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.dueDate && <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] ${isPast(task.dueDate) && !task.completed ? 'text-destructive' : 'text-muted-foreground'}`}><CalendarDays size={11} />{isToday(task.dueDate) ? 'Today' : displayDate(task.dueDate)}</span>}
          <span className={`h-1.5 w-1.5 rounded-full ${task.priority === 'high' ? 'bg-accent' : task.priority === 'medium' ? 'bg-primary/55' : 'bg-muted-foreground/30'}`} title={`${priorityLabels[task.priority]} priority`} />
          <button onClick={() => setShowDetails((open) => !open)} className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/65 hover:text-primary" aria-expanded={showDetails} data-testid={`button-task-details-${task.id}`}>{showDetails ? 'Hide details' : priorityLabels[task.priority]}</button>
        </div>
        {showDetails && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 task-enter">
          <label className="relative inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-[11px] text-muted-foreground"><span>Priority</span><select value={task.priority} onChange={(event) => onUpdate(task.id, { priority: event.target.value as Priority })} className="cursor-pointer bg-transparent font-semibold text-foreground outline-none" aria-label="Change task priority" data-testid={`select-priority-${task.id}`}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label className="relative inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-[11px] text-muted-foreground"><CalendarDays size={12} /><span>{task.dueDate ? displayDate(task.dueDate) : 'Set date'}</span><input type="date" value={task.dueDate} onChange={(event) => onUpdate(task.id, { dueDate: event.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Change due date" data-testid={`input-due-date-${task.id}`} /></label>
        </div>}
      </div>
      <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary" aria-label={`Edit ${task.text}`} data-testid={`button-pencil-task-${task.id}`}><Pencil size={14} /></button>
        <button onClick={() => onDelete(task.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-[#fae3de] hover:text-destructive" aria-label={`Delete ${task.text}`} data-testid={`button-delete-task-${task.id}`}><Trash2 size={14} /></button>
      </div>
    </div>
  </article>;
}

function EmptyState({ filter, search, onAdd }: { filter: Filter; search: string; onAdd: () => void }) {
  const title = search ? 'Nothing matched that search' : filter === 'completed' ? 'No finished tasks yet' : filter === 'today' ? 'A quiet day ahead' : filter === 'upcoming' ? 'Nothing waiting in the wings' : 'Your head is clear';
  const description = search ? 'Try another phrase, or add the thought you are looking for.' : filter === 'completed' ? 'Finished tasks will gather here as you move through your list.' : 'Start with the smallest next step. It does not need to be perfect.';
  return <div className="mt-5 flex min-h-[240px] flex-col items-center justify-center rounded-[20px] border border-dashed border-border bg-card/50 px-6 text-center task-enter" data-testid="empty-task-state">
    <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-[19px] bg-[#f7b19f]/30 text-primary"><div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-accent" /><Sparkles size={23} /></div>
    <h3 className="font-serif text-[24px] tracking-[-0.03em]">{title}</h3><p className="mt-2 max-w-[310px] text-[13px] leading-relaxed text-muted-foreground">{description}</p>
    {filter !== 'completed' && <button onClick={onAdd} className="mt-5 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-[12px] font-semibold text-secondary-foreground hover:bg-primary hover:text-primary-foreground" data-testid="button-empty-add-task"><Plus size={14} /> Add your next step</button>}
  </div>;
}

function filterTitle(filter: Filter) {
  return filter === 'today' ? 'For today' : filter === 'upcoming' ? 'Coming up' : 'Completed';
}
function filterLabel(filter: Filter) {
  return filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1);
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;