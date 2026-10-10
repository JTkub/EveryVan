import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useVan } from "../context/VanContext";
import type { RecurringSchedule, RecurringScheduleInput } from "../types/domain";
import { bangkokDateInput } from "../utils/date";
import { VEHICLE_CAPACITIES, vehicleCapacity } from "../utils/vehicle";

const emptyForm = (): RecurringScheduleInput => ({
  destination: "", drop_off_points: [], departure_time: "08:00", start_date: bangkokDateInput(),
  duration_minutes: 120, vehicle_type: "Toyota Commuter", license_plate: "", total_seats: 14,
  driver_id: 0, price: 220, enabled: true,
});

export function RecurringSchedules() {
  const { drivers, refreshDatabase } = useVan();
  const [items, setItems] = useState<RecurringSchedule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number>();
  const [stops, setStops] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setItems(await api.recurring.list()); }
    catch (e) { setError(e instanceof Error ? e.message : "โหลดสายประจำไม่สำเร็จ"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const change = <K extends keyof RecurringScheduleInput>(key: K, value: RecurringScheduleInput[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await api.recurring.save({ ...form, total_seats: vehicleCapacity(form.vehicle_type), drop_off_points: stops.split("\n").map(p => p.trim()).filter(Boolean) }, editing);
      setMessage(`บันทึกสายประจำแล้ว สร้างเที่ยวใหม่ ${result.created} เที่ยว`);
      setForm(emptyForm()); setStops(""); setEditing(undefined);
      await load(); await refreshDatabase();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  };
  const toggle = async (item: RecurringSchedule) => {
    setBusy(true); setError(""); setMessage("");
    try {
      await api.recurring.save({ ...item, enabled: !item.enabled }, item.recurring_id);
      setMessage(item.enabled ? "พักสายประจำแล้ว เที่ยวที่มีการจองหรือปรับเฉพาะวันยังคงอยู่" : "เปิดสายประจำแล้ว");
      await load(); await refreshDatabase();
    } catch (e) { setError(e instanceof Error ? e.message : "ปรับสถานะไม่สำเร็จ"); }
    finally { setBusy(false); }
  };
  return <section className="page-stack recurring-schedules">
    <div className="page-intro"><div><p className="eyebrow accent">DAILY QUEUE</p><h2>คิวสายประจำอัตโนมัติ</h2>
      <p className="muted">สร้างเที่ยวทุกวันล่วงหน้า 7 วัน ตามเวลาประเทศไทย</p></div></div>
    {error && <div className="alert error" role="alert">{error}</div>}
    {message && <div className="scan-result valid" role="status">{message}</div>}
    <div className="card-panel">
      <div className="section-head compact"><h3>สายประจำ</h3><button className="btn small outline" disabled={busy || loading} onClick={() => { setError(""); void load(); }}>โหลดใหม่</button></div>
      {loading ? <p className="muted">กำลังโหลด...</p> : items.length === 0 ? <p className="muted">ยังไม่มีสายประจำ เพิ่มรายการด้านล่างเพื่อเริ่มจัดคิวอัตโนมัติ</p> : items.map(item => <div className="recurring-row" key={item.recurring_id}>
        <div><strong>{item.destination} · {item.departure_time} น.</strong><p className="muted">{item.license_plate} · {item.driver_name} · {Number(item.price).toLocaleString()} บาท</p>
          <small>{item.enabled ? "เปิดใช้งานทุกวัน" : "พักสายประจำ"} · เริ่ม {item.start_date}</small></div>
        <div className="action-buttons"><button type="button" className="btn small outline" disabled={busy} onClick={() => { setEditing(item.recurring_id); setForm({ ...item, price: Number(item.price) }); setStops(item.drop_off_points.join("\n")); setError(""); setMessage(""); }}>แก้ไข</button>
          <button type="button" className="btn small outline" disabled={busy} onClick={() => void toggle(item)}>{item.enabled ? "พักสาย" : "เปิดสาย"}</button></div>
      </div>)}
    </div>
    <form className="card-panel trip-form" onSubmit={save}>
      <h3>{editing ? "แก้ไขสายประจำ" : "เพิ่มสายประจำ"}</h3>
      <p className="muted">การแก้ไขมีผลกับเที่ยวที่ยังไม่ออกเดินทาง ยังไม่มีผู้จอง และยังไม่ถูกปรับเฉพาะวัน</p>
      <div className="form-grid">
        <div className="field"><label htmlFor="recurring-destination">ปลายทาง</label><input id="recurring-destination" required maxLength={150} value={form.destination} onChange={e => change("destination", e.target.value)} /></div>
        <div className="field"><label htmlFor="recurring-time">เวลาออกทุกวัน</label><input id="recurring-time" type="time" required value={form.departure_time} onChange={e => change("departure_time", e.target.value)} /></div>
        <div className="field"><label htmlFor="recurring-start">วันที่เริ่ม</label><input id="recurring-start" type="date" required value={form.start_date} onChange={e => change("start_date", e.target.value)} /></div>
        <div className="field"><label htmlFor="recurring-duration">ระยะเวลาเดินทาง (นาที)</label><input id="recurring-duration" type="number" min={1} max={1440} required value={form.duration_minutes} onChange={e => change("duration_minutes", Number(e.target.value))} /></div>
        <div className="field"><label htmlFor="recurring-vehicle">ประเภทรถ</label><select id="recurring-vehicle" value={form.vehicle_type} onChange={e => change("vehicle_type", e.target.value)}>{Object.entries(VEHICLE_CAPACITIES).map(([type, capacity]) => <option key={type} value={type}>{type} ({capacity} ที่นั่ง)</option>)}</select></div>
        <div className="field"><label htmlFor="recurring-plate">ทะเบียนรถ</label><input id="recurring-plate" required maxLength={20} value={form.license_plate} onChange={e => change("license_plate", e.target.value)} /></div>
        <div className="field"><label htmlFor="recurring-driver">คนขับ</label><select id="recurring-driver" required value={form.driver_id || ""} onChange={e => change("driver_id", Number(e.target.value))}><option value="">เลือกคนขับ</option>{drivers.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></div>
        <div className="field"><label htmlFor="recurring-fare">ค่าโดยสาร (บาท)</label><input id="recurring-fare" required type="number" min={0} max={99999999.99} step="0.01" value={form.price} onChange={e => change("price", Number(e.target.value))} /></div>
        <div className="field"><label htmlFor="recurring-stops">จุดลงรถ (หนึ่งจุดต่อบรรทัด)</label><textarea id="recurring-stops" rows={4} required value={stops} onChange={e => setStops(e.target.value)} /></div>
      </div>
      <label className="recurring-enabled"><input type="checkbox" checked={form.enabled} onChange={e => change("enabled", e.target.checked)} /> เปิดสร้างคิวอัตโนมัติทุกวัน</label>
      <div className="form-actions">
        {editing && <button type="button" className="btn outline" disabled={busy} onClick={() => { setEditing(undefined); setForm(emptyForm()); setStops(""); }}>ยกเลิกแก้ไข</button>}
        <button className="btn primary" disabled={busy || !form.driver_id || !stops.trim()}>{busy ? "กำลังบันทึก..." : "บันทึกสายประจำ"}</button>
      </div>
    </form>
  </section>;
}
