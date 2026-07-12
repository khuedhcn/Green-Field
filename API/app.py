"""GreenField backend — Flask + SQLite.

Serves the Raise Ticket module (staff, tickets, config) and a server-side
proxy for Claude so the API key never ships to the browser.

Run:  python app.py         (dev, http://localhost:5000)
"""

import json
import os
import random
import string
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

import database as db

app = Flask(__name__)
CORS(app)  # allow the Vite dev server (5173) to call us directly if needed

TICKET_PREFIX = {"Raise ticket": "RT", "Thông báo": "TB", "Phản hồi ticket": "PH"}


# ── Helpers ───────────────────────────────────────────────────────────────────
def gen_id():
    """Short unique id, same shape as the old client-side genId()."""
    ts = format(int(time.time() * 1000), "x")
    tail = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return ts + tail


def gen_ticket_code(ticket_type, bu, seq):
    prefix = TICKET_PREFIX.get(ticket_type, "RT")
    bu_code = bu.replace(" ", "").replace("-", "")
    d = datetime.now()
    stamp = f"{d.day:02d}{d.month:02d}{d.year}"
    return f"{prefix}-{bu_code}-{stamp}-{str(seq).zfill(3)}"


def now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat()


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


# ── Staff ─────────────────────────────────────────────────────────────────────
@app.get("/api/staff")
def list_staff():
    conn = db.get_conn()
    try:
        rows = conn.execute("SELECT * FROM staff ORDER BY id").fetchall()
        return jsonify([db.staff_to_dict(r) for r in rows])
    finally:
        conn.close()


@app.post("/api/staff")
def add_staff():
    data = request.get_json(force=True) or {}
    sid = (data.get("id") or "").strip()
    name = (data.get("name") or "").strip()
    if not sid or not name:
        return jsonify({"error": "id và name là bắt buộc"}), 400

    conn = db.get_conn()
    try:
        exists = conn.execute("SELECT 1 FROM staff WHERE id = ?", (sid,)).fetchone()
        if exists:
            return jsonify({"error": f"Mã NV {sid} đã tồn tại"}), 409
        conn.execute(
            "INSERT INTO staff (id, name, level, bu, reports_to) VALUES (?, ?, ?, ?, ?)",
            (sid, name, data.get("level", "NV"), data.get("bu", "BU1"),
             data.get("reportsTo") or None),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM staff WHERE id = ?", (sid,)).fetchone()
        return jsonify(db.staff_to_dict(row)), 201
    finally:
        conn.close()


@app.put("/api/staff/<sid>")
def update_staff(sid):
    data = request.get_json(force=True) or {}
    conn = db.get_conn()
    try:
        row = conn.execute("SELECT * FROM staff WHERE id = ?", (sid,)).fetchone()
        if row is None:
            return jsonify({"error": "Không tìm thấy nhân sự"}), 404
        merged = {**db.staff_to_dict(row), **data}
        conn.execute(
            "UPDATE staff SET name = ?, level = ?, bu = ?, reports_to = ? WHERE id = ?",
            (merged["name"], merged["level"], merged["bu"],
             merged.get("reportsTo") or None, sid),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM staff WHERE id = ?", (sid,)).fetchone()
        return jsonify(db.staff_to_dict(row))
    finally:
        conn.close()


@app.delete("/api/staff/<sid>")
def delete_staff(sid):
    conn = db.get_conn()
    try:
        conn.execute("DELETE FROM staff WHERE id = ?", (sid,))
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()


# ── Tickets ───────────────────────────────────────────────────────────────────
@app.get("/api/tickets")
def list_tickets():
    conn = db.get_conn()
    try:
        rows = conn.execute("SELECT * FROM tickets ORDER BY date DESC").fetchall()
        return jsonify([db.ticket_to_dict(r) for r in rows])
    finally:
        conn.close()


@app.post("/api/tickets")
def create_ticket():
    data = request.get_json(force=True) or {}
    if not (data.get("what") or "").strip():
        return jsonify({"error": "WHAT là bắt buộc"}), 400

    conn = db.get_conn()
    try:
        raiser_id = data.get("raiserId")
        raiser = conn.execute("SELECT * FROM staff WHERE id = ?", (raiser_id,)).fetchone()
        if raiser is None:
            return jsonify({"error": "Người thực hiện không hợp lệ"}), 400

        ticket_type = data.get("type", "Raise ticket")
        bu = data.get("bu", "BU1")
        seq = conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0] + 1
        ticket = {
            "id": gen_id(),
            "code": gen_ticket_code(ticket_type, bu, seq),
            "type": ticket_type,
            "bu": bu,
            "raiser_id": raiser_id,
            "raiser_name": raiser["name"],
            "raiser_level": raiser["level"],
            "what": data.get("what", ""),
            "why": data.get("why", ""),
            "where_": data.get("where", ""),
            "when_": data.get("when", ""),
            "how": data.get("how", ""),
            "note": data.get("note", ""),
            "date": now_iso(),
            "useful": 0,
            "custom_points": None,
        }
        conn.execute(
            "INSERT INTO tickets (id, code, type, bu, raiser_id, raiser_name, "
            "raiser_level, what, why, where_, when_, how, note, date, useful, "
            "custom_points) VALUES (:id, :code, :type, :bu, :raiser_id, "
            ":raiser_name, :raiser_level, :what, :why, :where_, :when_, :how, "
            ":note, :date, :useful, :custom_points)",
            ticket,
        )
        conn.commit()
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket["id"],)).fetchone()
        return jsonify(db.ticket_to_dict(row)), 201
    finally:
        conn.close()


@app.patch("/api/tickets/<tid>")
def update_ticket(tid):
    data = request.get_json(force=True) or {}
    conn = db.get_conn()
    try:
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (tid,)).fetchone()
        if row is None:
            return jsonify({"error": "Không tìm thấy ticket"}), 404
        if "useful" in data:
            conn.execute("UPDATE tickets SET useful = ? WHERE id = ?",
                         (1 if data["useful"] else 0, tid))
        if "customPoints" in data:
            cp = data["customPoints"]
            conn.execute("UPDATE tickets SET custom_points = ? WHERE id = ?",
                         (cp if cp is not None else None, tid))
        conn.commit()
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (tid,)).fetchone()
        return jsonify(db.ticket_to_dict(row))
    finally:
        conn.close()


@app.delete("/api/tickets/<tid>")
def delete_ticket(tid):
    conn = db.get_conn()
    try:
        conn.execute("DELETE FROM tickets WHERE id = ?", (tid,))
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()


# ── Config (point rules + report emails) ──────────────────────────────────────
@app.get("/api/config")
def get_config():
    conn = db.get_conn()
    try:
        return jsonify({
            "points": db.get_setting(conn, "points", db.DEFAULT_POINTS),
            "emails": db.get_setting(conn, "emails", db.DEFAULT_EMAILS),
        })
    finally:
        conn.close()


@app.put("/api/config/points")
def put_points():
    data = request.get_json(force=True) or {}
    conn = db.get_conn()
    try:
        db.set_setting(conn, "points", data)
        conn.commit()
        return jsonify(data)
    finally:
        conn.close()


@app.put("/api/config/emails")
def put_emails():
    data = request.get_json(force=True)
    if not isinstance(data, list):
        return jsonify({"error": "Payload phải là danh sách email"}), 400
    conn = db.get_conn()
    try:
        db.set_setting(conn, "emails", data)
        conn.commit()
        return jsonify(data)
    finally:
        conn.close()


# ── Claude proxy (key stays server-side) ──────────────────────────────────────
@app.post("/api/ai/analyze")
def ai_analyze():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        # Frontend has a graceful fallback for this case.
        return jsonify({"error": "ANTHROPIC_API_KEY chưa được cấu hình"}), 503

    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    payload = {
        "model": model,
        "max_tokens": data.get("maxTokens", 1000),
        "messages": [{"role": "user", "content": prompt}],
    }
    if data.get("system"):
        payload["system"] = data["system"]

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        text = "".join(
            block.get("text", "")
            for block in body.get("content", [])
            if block.get("type") == "text"
        )
        return jsonify({"text": text})
    except urllib.error.HTTPError as e:
        return jsonify({"error": f"Anthropic API {e.code}", "detail": e.read().decode("utf-8", "ignore")}), 502
    except Exception as e:  # noqa: BLE001 - surface any transport error to the client
        return jsonify({"error": str(e)}), 502


if __name__ == "__main__":
    db.init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=True)
