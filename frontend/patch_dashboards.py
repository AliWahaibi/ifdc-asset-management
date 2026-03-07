import sys
import re

def process_file(filepath, asset_type_id):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. replace global columns with nothing
    columns_match = re.search(r'(const columns: Column<.*?>\[\] = \[\s*\{.*?\n\];)\n+(export function)', content, flags=re.DOTALL)
    if not columns_match:
        print(f"Could not find columns in {filepath}")
        return
    
    columns_code = columns_match.group(1)
    
    # We will modify the Reserve button inside columns_code to call handleReserveClick
    columns_code_modified = re.sub(
        r'onClick=\{async \(\) => \{.+?\}\}',
        r'onClick={() => handleReserveClick(row)}',
        columns_code,
        flags=re.DOTALL
    )

    func_decl = columns_match.group(2) 
    
    state_code = f"""
    const [reservationModalOpen, setReservationModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [reservationForm, setReservationForm] = useState({{ start_date: '', end_date: '', notes: '' }});
    const [reserving, setReserving] = useState(false);

    const handleReserveClick = (asset: any) => {{
        setSelectedAsset(asset);
        setReservationForm({{ start_date: '', end_date: '', notes: '' }});
        setReservationModalOpen(true);
    }};

    const handleReservationSubmit = async (e: React.FormEvent) => {{
        e.preventDefault();
        if (!selectedAsset) return;
        setReserving(true);
        try {{
            await reservationService.createReservation({{
                asset_type: '{asset_type_id}',
                asset_id: selectedAsset.id,
                start_date: new Date(reservationForm.start_date).toISOString(),
                end_date: new Date(reservationForm.end_date).toISOString(),
                notes: reservationForm.notes,
            }});
            toast.success(`Reservation requested for ${{selectedAsset.name}}`);
            setReservationModalOpen(false);
        }} catch (err: any) {{
            toast.error(err?.response?.data?.error || 'Failed to request reservation');
        }} finally {{
            setReserving(false);
        }}
    }};

    {columns_code_modified}
"""
    
    content = content[:columns_match.start()] + func_decl + state_code + content[columns_match.end():]

    modal_code = """
            {/* Reservation Modal */}
            <Modal isOpen={reservationModalOpen} onClose={() => setReservationModalOpen(false)} title={`Request Reservation: ${selectedAsset?.name}`}>
                <form onSubmit={handleReservationSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-300">Start Date</label>
                            <input required type="datetime-local" value={reservationForm.start_date} onChange={e => setReservationForm({ ...reservationForm, start_date: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-300">End Date</label>
                            <input required type="datetime-local" value={reservationForm.end_date} onChange={e => setReservationForm({ ...reservationForm, end_date: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-300">Reason / Notes</label>
                        <textarea required value={reservationForm.notes} onChange={e => setReservationForm({ ...reservationForm, notes: e.target.value })} className="h-24 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Please provide a valid reason..."></textarea>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => setReservationModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
                        <button type="submit" disabled={reserving} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400 disabled:opacity-50">
                            {reserving ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
"""
    content = re.sub(r'        </div>\n    \);\n}\n*$', modal_code, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched {filepath}")

process_file(r"d:\projects\IFDC asssets website\frontend\src\pages\OperationsDashboard.tsx", "drone")
process_file(r"d:\projects\IFDC asssets website\frontend\src\pages\OfficeDashboard.tsx", "office")
process_file(r"d:\projects\IFDC asssets website\frontend\src\pages\RndDashboard.tsx", "rnd")
