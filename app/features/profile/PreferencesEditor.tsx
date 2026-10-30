import { type Preferences } from './schema';
export default function PreferencesEditor({ value: p, change }: { value: Preferences; change: (p: Preferences) => void }) {
  const patch = (update: Partial<Preferences>) => change({ ...p, ...update });
  const csv = (value: string) => value.split(',').map(s => s.trim()).filter(Boolean);
  return <fieldset className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3 bg-white">
    <legend className="font-semibold px-2">Job preferences — supplied by you</legend>
    <p>Blank values mean unknown. Locations and overlap preferences do not establish work authorization.</p>
    {([['titles', 'Preferred job titles'], ['locations', 'Preferred locations'], ['overlapZones', 'Preferred overlap time zones (IANA)']] as const).map(([key, label]) => <div className="form-div" key={key}>
      <label htmlFor={`preference-${key}`}>{label}</label>
      <input id={`preference-${key}`} defaultValue={p[key].join(', ')} key={p[key].join('|')} placeholder="Separate values with commas" maxLength={3000} onBlur={e => patch({ [key]: csv(e.target.value) })} />
    </div>)}
    <label htmlFor="time-zone">Your time zone (IANA)</label><input id="time-zone" value={p.timeZone} maxLength={100} placeholder="Africa/Johannesburg" onChange={e => patch({ timeZone: e.target.value })} />
    <label htmlFor="weekly-hours">Working hours per week</label><input id="weekly-hours" type="number" min="0" max="168" value={p.hoursPerWeek ?? ''} onChange={e => patch({ hoursPerWeek: e.target.value === '' ? null : Number(e.target.value) })} />
    <label htmlFor="working-hours">Working days and hours / overlap notes</label><input id="working-hours" maxLength={500} value={p.workingHours} onChange={e => patch({ workingHours: e.target.value })} />
    <label className="flex items-center gap-2"><input style={{ width: '1rem', height: '1rem', padding: 0, boxShadow: 'none' }} type="checkbox" checked={p.salary !== null} onChange={e => patch({ salary: e.target.checked ? { min: 0, max: 0, currency: '', period: 'year' } : null })} /> Specify salary expectations</label>
    {p.salary && <div className="grid md:grid-cols-2 gap-3">
      {(['min', 'max'] as const).map(key => <div className="form-div" key={key}><label htmlFor={`salary-${key}`}>{key === 'min' ? 'Minimum salary' : 'Maximum salary'}</label><input id={`salary-${key}`} type="number" min="0" value={p.salary![key]} onChange={e => patch({ salary: { ...p.salary!, [key]: Number(e.target.value) } })} /></div>)}
      <div className="form-div"><label htmlFor="salary-currency">Salary currency (ISO code)</label><input id="salary-currency" maxLength={3} value={p.salary.currency} onChange={e => patch({ salary: { ...p.salary!, currency: e.target.value.toUpperCase() } })} /></div>
      <div className="form-div"><label htmlFor="salary-period">Salary period</label><select id="salary-period" value={p.salary.period} onChange={e => patch({ salary: { ...p.salary!, period: e.target.value as 'year' } })}><option value="hour">hour</option><option value="month">month</option><option value="year">year</option></select></div>
    </div>}
  </fieldset>;
}
