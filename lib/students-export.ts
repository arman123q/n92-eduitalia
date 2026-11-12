/**
 * Student Excel export (Admin → Student Portal).
 *
 * Builds a REAL .xlsx workbook with SheetJS (the dependency already
 * used by the products importer): one worksheet "N92 Students",
 * formatted header row with filters enabled, readable column widths,
 * registration dates as real Excel dates, and the header row frozen
 * (SheetJS Community Edition cannot emit frozen panes, so after the
 * workbook is written its sheet XML is patched inside the zip —
 * best-effort, the unpatched file is used if anything goes wrong).
 *
 * PRIVACY: the export column set is fixed by EXPORT_HEADERS below and
 * deliberately contains NO passport number, no password and no token
 * of any kind. The function is only reachable inside the owner-only
 * Students manager.
 */
import { profileCompletion, type StudentProfile } from "@/lib/student";

export interface StudentSource {
    account: { id: string; email: string; accountStatus: string; createdAt: string };
    profile: StudentProfile | null;
}

export const EXPORT_SHEET_NAME = "N92 Students";

export const EXPORT_HEADERS = [
    "Student ID",
    "Full name",
    "Email",
    "Phone",
    "Nationality",
    "Country",
    "City",
    "Preferred intake",
    "Target degree",
    "Preferred destination",
    "Education history",
    "Graduation year",
    "CGPA / percentage",
    "English proficiency (IELTS / TOEFL)",
    "Registration date",
    "Account status",
    "Profile completion %",
    "Profile status",
] as const;

const COLUMN_WIDTHS = [38, 26, 30, 16, 16, 18, 18, 15, 16, 22, 36, 13, 15, 26, 15, 13, 12, 14];

function text(v: unknown): string {
    return v === null || v === undefined ? "" : String(v);
}

/** Map domain records to export rows (array-of-arrays, header first
 *  row NOT included). Pure — unit-tested. Registration date is a real
 *  Date (or null) so Excel formats it as a date. */
export function buildStudentExportRows(sources: StudentSource[]): (string | number | Date | null)[][] {
    return sources.map(({ account, profile }) => {
        const completion = profileCompletion(profile);
        const reg = account.createdAt ? new Date(account.createdAt) : null;
        return [
            account.id,
            text(profile?.full_name) || "",
            account.email,
            text(profile?.phone),
            text(profile?.nationality),
            text(profile?.current_country),
            text(profile?.current_city),
            text(profile?.preferred_intake),
            text(profile?.target_degree),
            text(profile?.preferred_destination),
            text(profile?.education_history),
            text(profile?.graduation_year),
            text(profile?.cgpa),
            text(profile?.english_proficiency),
            reg && !Number.isNaN(reg.getTime()) ? reg : null,
            account.accountStatus,
            completion.percent,
            completion.complete ? "Complete" : "Incomplete",
        ];
    });
}

export interface StudentFilter {
    status: string; // all | pending | active | suspended
    query: string;
    completion: string; // all | complete | incomplete
}

/** Apply the admin list filters (status tab, search, completion) so
 *  "export filtered view" matches exactly what the owner sees.
 *  Pure — unit-tested. */
export function filterStudentSources(sources: StudentSource[], filter: StudentFilter): StudentSource[] {
    const q = filter.query.trim().toLowerCase();
    return sources.filter(({ account, profile }) => {
        if (filter.status !== "all" && account.accountStatus !== filter.status) return false;
        if (filter.completion !== "all") {
            const complete = profileCompletion(profile).complete;
            if (filter.completion === "complete" && !complete) return false;
            if (filter.completion === "incomplete" && complete) return false;
        }
        if (q) {
            const hay = `${profile?.full_name || ""} ${account.email} ${account.id}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

/* ------------------------------------------------------------------ */
/*  Frozen header row: minimal zip patch                               */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

async function streamTransform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
    const writer = stream.writable.getWriter();
    void writer.write(bytes as unknown as BufferSource);
    void writer.close();
    const reader = stream.readable.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
}

/** Return a copy of the xlsx whose first worksheet freezes row 1.
 *  Any failure returns the original buffer unchanged — the export
 *  itself never breaks because of the freeze enhancement. */
export async function patchFreezeHeader(input: ArrayBuffer): Promise<ArrayBuffer> {
    try {
        if (typeof CompressionStream === "undefined" || typeof DecompressionStream === "undefined") return input;
        const buf = new Uint8Array(input);
        const view = new DataView(input);
        // Locate the End Of Central Directory record.
        let eocd = -1;
        for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
            if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) return input;
        const count = view.getUint16(eocd + 10, true);
        let cdOffset = view.getUint32(eocd + 16, true);

        interface Entry { name: string; method: number; crc: number; csize: number; usize: number; localOffset: number; cdRecord: Uint8Array }
        const entries: Entry[] = [];
        let p = cdOffset;
        for (let i = 0; i < count; i++) {
            if (view.getUint32(p, true) !== 0x02014b50) return input;
            const nameLen = view.getUint16(p + 28, true);
            const extraLen = view.getUint16(p + 30, true);
            const commentLen = view.getUint16(p + 32, true);
            const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
            entries.push({
                name,
                method: view.getUint16(p + 10, true),
                crc: view.getUint32(p + 16, true),
                csize: view.getUint32(p + 20, true),
                usize: view.getUint32(p + 24, true),
                localOffset: view.getUint32(p + 42, true),
                cdRecord: buf.subarray(p, p + 46 + nameLen + extraLen + commentLen),
            });
            p += 46 + nameLen + extraLen + commentLen;
        }

        const targetName = entries.find((e) => /^xl\/worksheets\/sheet1\.xml$/.test(e.name))?.name
            ?? entries.find((e) => e.name.startsWith("xl/worksheets/") && e.name.endsWith(".xml"))?.name;
        if (!targetName) return input;

        const outChunks: Uint8Array[] = [];
        let outLen = 0;
        const push = (chunk: Uint8Array) => { outChunks.push(chunk); outLen += chunk.length; };
        const newOffsets = new Map<string, number>();
        const patched = new Map<string, { crc: number; csize: number; usize: number }>();

        for (const entry of entries) {
            const lp = entry.localOffset;
            if (view.getUint32(lp, true) !== 0x04034b50) return input;
            const lNameLen = view.getUint16(lp + 26, true);
            const lExtraLen = view.getUint16(lp + 28, true);
            const dataStart = lp + 30 + lNameLen + lExtraLen;
            const rawData = buf.subarray(dataStart, dataStart + entry.csize);
            newOffsets.set(entry.name, outLen);
            if (entry.name !== targetName) {
                push(buf.subarray(lp, dataStart + entry.csize)); // verbatim copy
                continue;
            }
            // Inflate, patch the XML, re-deflate, rebuild the record.
            const plain = entry.method === 8
                ? await streamTransform(rawData, new DecompressionStream("deflate-raw"))
                : rawData.slice();
            let xml = new TextDecoder().decode(plain);
            const pane = '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>';
            const m = xml.match(/<sheetView([^>]*?)(\/>|>)/);
            if (!m) return input;
            xml = m[2] === "/>"
                ? xml.replace(m[0], `<sheetView${m[1]}>${pane}</sheetView>`)
                : xml.replace(m[0], `${m[0]}${pane}`);
            const newPlain = new TextEncoder().encode(xml);
            const newData = await streamTransform(newPlain, new CompressionStream("deflate-raw"));
            const newCrc = crc32(newPlain);
            const header = new Uint8Array(buf.subarray(lp, dataStart)); // local header + name + extra
            const hv = new DataView(header.buffer, header.byteOffset, header.byteLength);
            hv.setUint16(8, 8, true); // method: deflate (SheetJS writes stored; the patched entry is compressed)
            hv.setUint32(14, newCrc, true);
            hv.setUint32(18, newData.length, true);
            hv.setUint32(22, newPlain.length, true);
            push(header);
            push(newData);
            patched.set(entry.name, { crc: newCrc, csize: newData.length, usize: newPlain.length });
        }

        const newCdOffset = outLen;
        for (const entry of entries) {
            const record = entry.cdRecord.slice();
            const rv = new DataView(record.buffer, record.byteOffset, record.byteLength);
            rv.setUint32(42, newOffsets.get(entry.name) as number, true);
            const patch = patched.get(entry.name);
            if (patch) {
                rv.setUint16(10, 8, true); // method: deflate, matching the local record
                rv.setUint32(16, patch.crc, true);
                rv.setUint32(20, patch.csize, true);
                rv.setUint32(24, patch.usize, true);
            }
            push(record);
        }
        const newEocd = new Uint8Array(buf.subarray(eocd, eocd + 22));
        const ev = new DataView(newEocd.buffer, newEocd.byteOffset, newEocd.byteLength);
        ev.setUint32(12, outLen - newCdOffset, true);
        ev.setUint32(16, newCdOffset, true);
        push(newEocd);

        const out = new Uint8Array(outLen);
        let off = 0;
        for (const c of outChunks) { out.set(c, off); off += c.length; }
        return out.buffer;
    } catch {
        return input;
    }
}

/* ------------------------------------------------------------------ */
/*  Workbook build + download                                          */
/* ------------------------------------------------------------------ */

/** Build the .xlsx bytes for the given (already chosen) sources.
 *  The freeze patch is applied best-effort. */
export async function buildStudentsWorkbookBuffer(sources: StudentSource[]): Promise<ArrayBuffer> {
    const XLSX = await import("xlsx");
    const rows = buildStudentExportRows(sources);
    const aoa: (string | number | Date | null)[][] = [EXPORT_HEADERS.slice() as unknown as string[], ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
    ws["!cols"] = COLUMN_WIDTHS.map((wch) => ({ wch }));
    const lastCol = XLSX.utils.encode_col(EXPORT_HEADERS.length - 1);
    ws["!autofilter"] = { ref: `A1:${lastCol}${rows.length + 1}` };
    // Format the registration-date column as real dates.
    const dateColIdx = EXPORT_HEADERS.indexOf("Registration date");
    for (let r = 0; r < rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r: r + 1, c: dateColIdx })];
        if (cell && rows[r][dateColIdx] instanceof Date) cell.z = "dd-mmm-yyyy";
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, EXPORT_SHEET_NAME);
    const raw = XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true }) as ArrayBuffer;
    return patchFreezeHeader(raw);
}

/** Browser entry point: build + download. Returns the row count. */
export async function downloadStudentsExcel(sources: StudentSource[]): Promise<number> {
    const buffer = await buildStudentsWorkbookBuffer(sources);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `N92_Students_Export_${today}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return sources.length;
}
