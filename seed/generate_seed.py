#!/usr/bin/env python3
"""
ɖevi ƒe agbalẽ — Hack4Children 2026
Générateur de données de DÉMONSTRATION (enfants fictifs) — déterministe.

Produit :
  - sql/03_seed_demo.sql   (rejouable : supprime d'abord les enfants is_demo)
  - seed/csv/*.csv         (optionnel, option --csv, pour import Table Editor)

Usage :
  python seed/generate_seed.py                       # as_of = aujourd'hui, 300 enfants
  python seed/generate_seed.py --as-of 2026-11-20    # figer la date de référence
  python seed/generate_seed.py --n 300 --seed 4 --csv

IMPORTANT
  * Aucune donnée réelle : prénoms courants, numéros +228 00xxxxxx (plage non attribuée).
  * Les dates sont calculées par rapport à --as-of : régénérez le fichier juste
    avant la démo / les captures pour que « aujourd'hui » reste cohérent.
  * Courbe OMS : médianes approchées (interpolation) — À REMPLACER par les tables
    LMS officielles extraites par Gerson (table who_weight_for_age).
  * Calendrier PEV : officiel (PEV Togo), défini dans 01_schema.sql ; SCHEDULE ci-dessous doit rester identique.
"""
import argparse
import csv
import datetime as dt
import math
import pathlib
import random
import uuid

# ----------------------------------------------------------------------
# 1. Paramètres du scénario (zones de Lomé, comportement par zone)
# ----------------------------------------------------------------------
# base  : probabilité d'être présent au 1er rendez-vous vaccinal
# drop  : perte relative supplémentaire à chaque rendez-vous suivant (abandon)
# cert  : proportion d'enfants SANS acte de naissance
# stag  : proportion d'enfants avec une courbe qui stagne/chute récemment
# zmean : z-score moyen de poids-pour-l'âge de la zone
# listen: probabilité d'écouter un vocal WhatsApp
ZONES = [
    # id, zone, commune, centre, poids, base, drop, cert, stag, zmean, listen, dist(km min,max)
    (1, "Bè-Kpota",     "Golfe 1", "Centre de santé de Bè-Kpota",     0.22, 0.93, 0.03, 0.06, 0.06, -0.20, 0.82, (0.3, 2.0)),
    (2, "Hanoukopé",    "Golfe 2", "Centre de santé de Hanoukopé",    0.16, 0.88, 0.05, 0.15, 0.09, -0.40, 0.76, (0.3, 2.5)),
    (3, "Adidogomé",    "Golfe 5", "Centre de santé d'Adidogomé",     0.18, 0.84, 0.06, 0.10, 0.10, -0.45, 0.72, (0.5, 3.5)),
    (4, "Agoè-Nyivé",   "Agoè-Nyivé", "Centre de santé d'Agoè",       0.18, 0.76, 0.09, 0.18, 0.14, -0.65, 0.64, (0.8, 5.0)),
    (5, "Djidjolé",     "Golfe 3", "Centre de santé de Djidjolé",     0.14, 0.80, 0.07, 0.14, 0.11, -0.55, 0.68, (0.5, 3.5)),
    (6, "Baguida",      "Golfe 7", "Centre de santé de Baguida",      0.12, 0.62, 0.13, 0.26, 0.20, -0.95, 0.52, (1.5, 8.0)),
]
DAYCARES = [  # id, nom, zone_id
    (1, "Garderie Communautaire Intégrée — marché de Hanoukopé", 2),
    (2, "Garderie Communautaire Intégrée — marché d'Adidogomé", 3),
]
LANG_W = {"ewe": 0.58, "mina": 0.27, "fr": 0.10, "kabiye": 0.05}

# Calendrier PEV officiel du Togo (id, code, dose, libellé, âge en jours, contact)
# DOIT rester identique à la table vaccine_schedule de 01_schema.sql (mêmes id).
SCHEDULE = [
    (1, "BCG", 1, "BCG", 0, 1), (2, "VPO", 0, "VPO 0", 0, 1),
    (3, "PENTA", 1, "Penta 1", 42, 2), (4, "VPO", 1, "VPO 1", 42, 2),
    (5, "PNEUMO", 1, "Pneumo 1", 42, 2), (6, "ROTA", 1, "Rota 1", 42, 2),
    (7, "PENTA", 2, "Penta 2", 70, 3), (8, "VPO", 2, "VPO 2", 70, 3),
    (9, "PNEUMO", 2, "Pneumo 2", 70, 3), (10, "ROTA", 2, "Rota 2", 70, 3),
    (11, "PENTA", 3, "Penta 3", 98, 4), (12, "VPO", 3, "VPO 3", 98, 4),
    (13, "PNEUMO", 3, "Pneumo 3", 98, 4), (14, "VPI", 1, "VPI 1", 98, 4),
    (15, "VAP", 1, "VAP 1", 152, 5), (16, "VAP", 2, "VAP 2", 183, 6), (17, "VAP", 3, "VAP 3", 213, 7),
    (18, "RR", 1, "RR 1", 274, 8), (19, "VAA", 1, "VAA", 274, 8), (20, "VPI", 2, "VPI 2", 274, 8),
    (21, "RR", 2, "RR 2", 457, 9), (22, "MENA", 1, "MenA", 457, 9), (23, "VAP", 4, "VAP 4", 457, 9),
]
# Perte progressive de présence au fil des contacts (indice d'abandon par âge de contact)
VISIT_DECAY = {0: 0, 42: 1, 70: 2, 98: 3, 152: 4, 183: 4.5, 213: 5, 274: 5.5, 457: 6.5}
VISIT_DAYS = list(VISIT_DECAY)
GRACE = 3                                       # J+3 : « manqué »
ALERT_DAYS = 7                                  # J+7 : alerte agent

# Médianes OMS poids-pour-l'âge (kg) — approximation par points d'ancrage
AGES_M = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48, 60, 72]
MED_M = [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6, 10.9, 12.2, 14.3, 16.3, 18.3, 20.5]
MED_F = [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9, 10.2, 11.5, 13.9, 16.1, 18.2, 20.2]

# Seuls les prénoms couverts par le catalogue audio (voix/README_voix.md).
NAMES_M = ["Kosi", "Yao", "Kodzo", "Komi", "Mawuli"]
NAMES_F = ["Ama", "Afi", "Akosiwa", "Abla", "Sena"]
GUARDIAN_PREFIX = ["Maman", "Mme", "Papa", "Mamie", "Tante"]

# ----------------------------------------------------------------------
# 2. Utilitaires
# ----------------------------------------------------------------------
def interp(ages, vals, x):
    x = max(ages[0], min(ages[-1], x))
    for i in range(len(ages) - 1):
        if ages[i] <= x <= ages[i + 1]:
            t = (x - ages[i]) / (ages[i + 1] - ages[i])
            return vals[i] + t * (vals[i + 1] - vals[i])
    return vals[-1]

def median_w(sex, age_m):
    return interp(AGES_M, MED_M if sex == "M" else MED_F, age_m)

def sd_scale(age_m):
    return 0.14 if age_m < 3 else (0.11 if age_m < 36 else 0.12)

def zscore(sex, age_m, w):
    return math.log(w / median_w(sex, age_m)) / sd_scale(age_m)

def weight_from_z(sex, age_m, z):
    return median_w(sex, age_m) * math.exp(z * sd_scale(age_m))

def det_uuid(rng):
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))

def sql_lit(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(round(v, 4)) if isinstance(v, float) else str(v)
    if isinstance(v, (dt.date, dt.datetime)):
        return "'" + v.isoformat(sep=" ") + "'" if isinstance(v, dt.datetime) else "'" + v.isoformat() + "'"
    return "'" + str(v).replace("'", "''") + "'"

def pick_weighted(rng, items, weights):
    return rng.choices(items, weights=weights, k=1)[0]

# ----------------------------------------------------------------------
# 3. Génération
# ----------------------------------------------------------------------
def generate(n, seed, as_of):
    rng = random.Random(seed)
    now = dt.datetime.combine(as_of, dt.time(12, 0))
    zone_by_id = {z[0]: z for z in ZONES}
    sched_rows = SCHEDULE

    tables = {k: [] for k in
              ["zones", "health_centers", "daycares", "vaccine_schedule", "children", "guardians",
               "appointments", "weigh_ins", "messages", "alerts"]}

    for z in ZONES:
        tables["zones"].append(dict(id=z[0], name=z[1], commune=z[2], prefecture="Golfe"))
        tables["health_centers"].append(dict(id=z[0], name=z[3], zone_id=z[0], lat=None, lng=None))
    # Centre supplémentaire demandé par l'application (audio Sylvanus Olympio).
    tables["health_centers"].append(dict(
        id=7, name="Centre Hospitalier Sylvanus Olympio", zone_id=1, lat=None, lng=None))
    for d in DAYCARES:
        tables["daycares"].append(dict(id=d[0], name=d[1], zone_id=d[2], center_id=d[2]))

    zone_ids = [z[0] for z in ZONES]
    zone_w = [z[4] for z in ZONES]

    for _ in range(n):
        zid = pick_weighted(rng, zone_ids, zone_w)
        z = zone_by_id[zid]
        _, zname, _, _, _, base, drop, cert_miss, stag_p, zmean, listen_p, (dmin, dmax) = z

        sex = rng.choice(["M", "F"])
        first = rng.choice(NAMES_M if sex == "M" else NAMES_F)

        # âge : 55 % < 24 mois, 45 % entre 24 et 72 mois
        if rng.random() < 0.55:
            age_days = int(rng.uniform(5, 730))
        else:
            age_days = int(rng.uniform(730, 6 * 365))
        birth = as_of - dt.timedelta(days=age_days)
        age_m = age_days / 30.4375

        daycare_id = None
        for d in DAYCARES:
            if d[2] == zid and age_m >= 9 and rng.random() < 0.5:
                daycare_id = d[0]

        child_id = det_uuid(rng)
        created = max(birth, as_of - dt.timedelta(days=rng.randint(0, 400)))
        if age_days < 60:
            created = birth + dt.timedelta(days=rng.randint(0, min(5, age_days)))
        created_ts = dt.datetime.combine(created, dt.time(9, 0))
        has_cert = rng.random() > cert_miss
        resolved = None
        child = dict(
            id=child_id, qr_token=uuid.UUID(int=rng.getrandbits(128)).hex[:18],
            first_name=first, birth_date=birth, sex=sex, center_id=zid, daycare_id=daycare_id,
            zone_id=zid, has_birth_certificate=has_cert, birth_cert_resolved_at=resolved,
            distance_km=round(rng.uniform(dmin, dmax), 1), is_demo=True, created_at=created_ts)
        tables["children"].append(child)

        # --- responsable de l'enfant ---------------------------------
        lang = pick_weighted(rng, list(LANG_W), list(LANG_W.values()))
        chan = "whatsapp"  # prototype : tout part sur WhatsApp
        guardian_id = det_uuid(rng)
        phone = "+22800" + "".join(str(rng.randint(0, 9)) for _ in range(6))
        tables["guardians"].append(dict(
            id=guardian_id, child_id=child_id,
            name=f"{rng.choice(GUARDIAN_PREFIX)} {rng.choice(NAMES_F if rng.random() < 0.8 else NAMES_M)}",
            phone=phone, language=lang, channel_pref=chan, is_primary=True,
            consent_at=created_ts))

        # --- rendez-vous vaccinaux -----------------------------------
        cfactor = rng.uniform(0.88, 1.10)
        attended = {}
        for vday in VISIT_DAYS:
            due = birth + dt.timedelta(days=vday)
            if due > as_of:
                attended[vday] = None                       # à venir
                continue
            p = min(0.985, base * ((1 - drop) ** VISIT_DECAY[vday]) * cfactor)
            if vday == 0:
                p = min(0.985, p + 0.04)                    # naissance : BCG quasi systématique
            if rng.random() < p:
                attended[vday] = due + dt.timedelta(days=rng.choice([0, 0, 0, 1, 1, 2, 3, 5]))
            elif (as_of - due).days > 45 and rng.random() < 0.25:
                attended[vday] = due + dt.timedelta(days=rng.randint(10, 40))   # rattrapage
            else:
                attended[vday] = False

        child_appts = []
        for i, code, dose, _, age, contact in sched_rows:
            due = birth + dt.timedelta(days=age)
            att = attended[age]
            if att is None or att is False and (as_of - due).days < GRACE:
                status, done_at = "planned", None
            elif att is False:
                status, done_at = "missed", None
            else:
                if att > as_of:
                    att = as_of
                status, done_at = "done", att
            appt = dict(id=det_uuid(rng), child_id=child_id, schedule_id=i, due_date=due,
                        status=status, done_at=done_at, recorded_by=None, _contact=contact)
            child_appts.append(appt)
            tables["appointments"].append(appt)

        # --- pesées ---------------------------------------------------
        z_child = rng.gauss(zmean, 0.9)
        flagged = rng.random() < stag_p and age_m >= 4
        ages_w = []
        if age_m < 24:
            k = 0
            while k <= age_m:
                if rng.random() < min(0.95, base + 0.1):
                    ages_w.append(k + rng.uniform(0, 0.4))
                k += 1
        else:
            k = 0
            while k <= min(age_m, 23):
                if rng.random() < 0.7:
                    ages_w.append(k + rng.uniform(0, 0.4))
                k += 2
            step = 1 if daycare_id else 6
            k = 24
            while k <= age_m:
                if daycare_id or rng.random() < 0.5:
                    ages_w.append(k + rng.uniform(0, 0.4))
                k += step
        ages_w = [a for a in ages_w if a <= age_m]
        if not ages_w:
            ages_w = [min(age_m, 0.2)]
        weights = []
        for a in ages_w:
            w = weight_from_z(sex, a, z_child + rng.gauss(0, 0.2))
            if weights:
                w = max(w, weights[-1] * 1.01)
            weights.append(w)
        if flagged and len(weights) >= 4:
            weights[-2] = weights[-3] * 1.005
            weights[-1] = weights[-2] * rng.choice([1.0, 1.003, 0.985])
        prev_w = prev_z = None
        for a, w in zip(ages_w, weights):
            zs = zscore(sex, a, w)
            if prev_w is None:
                trend = "ok"
            elif w < prev_w * 0.99:
                trend = "chute"
            elif zs - prev_z <= -0.5 or (w - prev_w) < 0.02:
                trend = "stagnation"
            else:
                trend = "ok"
            when = birth + dt.timedelta(days=int(a * 30.4375))
            tables["weigh_ins"].append(dict(
                id=det_uuid(rng), child_id=child_id, measured_at=min(when, as_of),
                weight_kg=round(w, 2), age_months=round(a, 1), z_score=round(zs, 2),
                trend=trend, recorded_by=None))
            prev_w, prev_z = w, zs
            last_trend, last_when = trend, when

        # --- messages & alertes --------------------------------------
        def add_msg(template, appt, ts, channel, force_status=None):
            sched = ts
            if force_status:
                status = force_status
            elif sched > now:
                status = "scheduled"
            elif rng.random() < 0.03:
                status = "failed"
            elif channel == "whatsapp":
                status = "listened" if rng.random() < listen_p else "delivered"
            else:
                status = "listened" if rng.random() < 0.8 else "delivered"
            sent_at = sched if status != "scheduled" else None
            key = responded = None
            if channel == "voice" and status in ("listened", "delivered") and rng.random() < 0.6:
                key = pick_weighted(rng, [1, 2, 3], [0.6, 0.3, 0.1])
                responded = sched + dt.timedelta(minutes=rng.randint(1, 15))
            tpl_key = f"{template}_C{appt['_contact']}" if appt else template
            tables["messages"].append(dict(
                id=det_uuid(rng), child_id=child_id, guardian_id=guardian_id,
                appointment_id=appt["id"] if appt else None, template_code=template,
                channel=channel, language=lang, scheduled_for=sched, sent_at=sent_at,
                status=status, audio_url=None,  # rempli par le backend depuis le catalogue
                response_key=key, responded_at=responded, is_simulated=False))

        if age_days <= 90:
            add_msg("WELCOME", None, created_ts, chan)
        by_contact = {}
        for ap in child_appts:
            by_contact.setdefault(ap["_contact"], []).append(ap)
        for _c, group in sorted(by_contact.items()):
            appt = group[0]                       # 1 message / 1 alerte par contact vaccinal
            due = appt["due_date"]
            if not (as_of - dt.timedelta(days=60) <= due <= as_of + dt.timedelta(days=2)):
                continue
            for tpl, off in (("J-2", 2), ("J-1", 1), ("J0", 0)):
                if appt["status"] == "done" and appt["done_at"] and appt["done_at"] < due - dt.timedelta(days=off):
                    continue
                add_msg(tpl, appt, dt.datetime.combine(due - dt.timedelta(days=off), dt.time(8, 0)), chan)
            late = appt["status"] == "missed" or (
                appt["status"] == "done" and appt["done_at"] and (appt["done_at"] - due).days >= GRACE)
            if late and due + dt.timedelta(days=GRACE) <= as_of:
                add_msg("MISSED_3", appt, dt.datetime.combine(due + dt.timedelta(days=GRACE), dt.time(10, 0)), chan)
            if appt["status"] == "missed" and (as_of - due).days >= ALERT_DAYS:
                tables["alerts"].append(dict(
                    id=det_uuid(rng), child_id=child_id, appointment_id=appt["id"], type="missed_7d",
                    target_role="agent", center_id=zid,
                    status=pick_weighted(rng, ["open", "acknowledged"], [0.75, 0.25]),
                    created_at=dt.datetime.combine(due + dt.timedelta(days=ALERT_DAYS), dt.time(7, 0)),
                    resolved_at=None))
        if not has_cert:
            add_msg("BIRTH_CERT", None, created_ts + dt.timedelta(days=1), chan)
            tables["alerts"].append(dict(
                id=det_uuid(rng), child_id=child_id, appointment_id=None, type="birth_cert_missing",
                target_role="educatrice" if daycare_id else "agent", center_id=zid, status="open",
                created_at=created_ts + dt.timedelta(days=1), resolved_at=None))
        if last_trend != "ok" and (as_of - last_when.date() if isinstance(last_when, dt.datetime) else as_of - last_when).days <= 45:
            tables["alerts"].append(dict(
                id=det_uuid(rng), child_id=child_id, appointment_id=None, type="growth_stagnation",
                target_role="agent", center_id=zid, status="open",
                created_at=dt.datetime.combine(min(last_when, as_of), dt.time(15, 0)), resolved_at=None))

    for t in tables["appointments"]:
        t.pop("_contact")
    return tables

# ----------------------------------------------------------------------
# 4. Sorties
# ----------------------------------------------------------------------
ORDER = ["zones", "health_centers", "daycares", "children", "guardians",
         "appointments", "weigh_ins", "messages", "alerts"]
REFERENCE = {"zones", "health_centers", "daycares"}

def write_sql(tables, path, as_of, n, seed):
    out = [f"-- Données de DÉMONSTRATION — généré par generate_seed.py",
           f"-- as_of={as_of} n={n} seed={seed} — aucune donnée réelle",
           "begin;",
           "delete from children where is_demo;   -- cascade : rendez-vous, pesées, messages, alertes, responsables"]
    for name in ORDER:
        rows = tables[name]
        if not rows:
            continue
        cols = list(rows[0].keys())
        conflict = " on conflict do nothing" if name in REFERENCE else ""
        for i in range(0, len(rows), 250):
            chunk = rows[i:i + 250]
            values = ",\n  ".join("(" + ", ".join(sql_lit(r[c]) for c in cols) + ")" for r in chunk)
            out.append(f"insert into {name} ({', '.join(cols)}) values\n  {values}{conflict};")
    out.append("commit;")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(out) + "\n", encoding="utf-8")

def write_csv(tables, folder):
    folder.mkdir(parents=True, exist_ok=True)
    for name in ORDER:
        rows = tables[name]
        if not rows:
            continue
        with open(folder / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=300)
    ap.add_argument("--seed", type=int, default=4)
    ap.add_argument("--as-of", type=dt.date.fromisoformat, default=dt.date.today())
    ap.add_argument("--csv", action="store_true")
    ap.add_argument("--out", default=None, help="chemin du .sql (défaut: sql/03_seed_demo.sql)")
    args = ap.parse_args()

    root = pathlib.Path(__file__).resolve().parent.parent   # racine du dépôt
    tables = generate(args.n, args.seed, args.as_of)
    out = pathlib.Path(args.out) if args.out else root / "sql" / "03_seed_demo.sql"
    write_sql(tables, out, args.as_of, args.n, args.seed)
    if args.csv:
        write_csv(tables, root / "seed" / "csv")
    print(f"OK — {out}")
    for name in ORDER:
        print(f"  {name:18s} {len(tables[name]):6d} lignes")

if __name__ == "__main__":
    main()
