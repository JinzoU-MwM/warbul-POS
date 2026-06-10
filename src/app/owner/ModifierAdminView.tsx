"use client";
// Owner dashboard admin for modifier / add-on groups (e.g. "Ukuran", "Tambahan")
// and their options. Lists groups as cards; group + option editors are simple
// inline modals. All mutations go through the typed api client, then reload().
import { useCallback, useEffect, useState, type CSSProperties, type JSX } from "react";
import {
  getModifiers,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  createModifierOption,
  updateModifierOption,
  deleteModifierOption,
} from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { CATS, rupiah } from "@/lib/constants";
import { Switch, Icons, RecipeEditor } from "@/components";
import type { Category, ModGroupFull, ModOption, ModType } from "@/lib/types";

const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#6f6353" };

/* A blank draft (no id) opens the group editor in "create" mode. */
type GroupDraft = { id?: string; name: string; type: ModType; categories: Category[] };
/* An option editor is always tied to a group; no id means "create". */
type OptionDraft = { groupId: string; id?: string; label: string; price: number; def: boolean };

export function ModifierAdminView(): JSX.Element {
  const [groups, setGroups] = useState<ModGroupFull[]>([]);
  const [groupEdit, setGroupEdit] = useState<GroupDraft | null>(null);
  const [optionEdit, setOptionEdit] = useState<OptionDraft | null>(null);
  const [delGroup, setDelGroup] = useState<ModGroupFull | null>(null);
  const [recipeFor, setRecipeFor] = useState<ModOption | null>(null);
  const [note, setNote] = useState<string>("");

  const reload = useCallback(() => {
    getModifiers().then(setGroups).catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useLive(["modifiers"], reload);

  function flashNote(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(""), 2400);
  }

  async function confirmDeleteGroup() {
    if (!delGroup) return;
    const id = delGroup.id;
    setDelGroup(null);
    try {
      await deleteModifierGroup(id);
      reload();
    } catch {
      /* ignore */
    }
  }

  async function deleteOption(group: ModGroupFull, opt: ModOption) {
    if (group.options.length <= 1) {
      flashNote(`"${group.name}" minimal punya 1 opsi — tidak bisa dihapus.`);
      return;
    }
    try {
      await deleteModifierOption(opt.id);
      reload();
    } catch {
      /* ignore */
    }
  }

  function openNewGroup() {
    setGroupEdit({ name: "", type: "single", categories: [] });
  }

  return (
    <>
      <ModStyles />

      <header
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid var(--line)",
          background: "var(--paper-2)",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div className="brand" style={{ fontSize: 23, fontWeight: 700 }}>Add-on &amp; Varian</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginTop: 2 }}>
            Kelola grup modifier (ukuran, tambahan, dll) yang muncul di menu.
          </div>
        </div>
        <button className="ma-mod-addbtn" onClick={openNewGroup}>
          <Icons.plus size={17} color="var(--cream)" /> Tambah Grup
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div style={{ maxWidth: 820 }}>
          {note && <div className="ma-mod-note">{note}</div>}

          {groups.length === 0 && (
            <div className="owner-card" style={{ padding: "34px 24px", textAlign: "center", color: "#8b7f6c" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>Belum ada grup add-on</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Buat grup pertamamu — misalnya &quot;Ukuran&quot; atau &quot;Topping&quot;.
              </div>
            </div>
          )}

          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onEditGroup={() => setGroupEdit({ id: g.id, name: g.name, type: g.type, categories: g.categories })}
              onDeleteGroup={() => setDelGroup(g)}
              onAddOption={() => setOptionEdit({ groupId: g.id, label: "", price: 0, def: false })}
              onEditOption={(o) =>
                setOptionEdit({ groupId: g.id, id: o.id, label: o.label, price: o.price, def: Boolean(o.def) })
              }
              onDeleteOption={(o) => deleteOption(g, o)}
              onRecipeOption={(o) => setRecipeFor(o)}
            />
          ))}
        </div>
      </div>

      {groupEdit && (
        <GroupEditor draft={groupEdit} onClose={() => setGroupEdit(null)} onSaved={() => { setGroupEdit(null); reload(); }} />
      )}

      {optionEdit && (
        <OptionEditor
          draft={optionEdit}
          group={groups.find((g) => g.id === optionEdit.groupId) ?? null}
          onClose={() => setOptionEdit(null)}
          onSaved={() => { setOptionEdit(null); reload(); }}
        />
      )}

      {recipeFor && (
        <RecipeEditor
          ownerType="option"
          ownerId={recipeFor.id}
          title={recipeFor.label}
          onClose={() => setRecipeFor(null)}
        />
      )}

      {delGroup && (
        <div className="ma-mod-bd" onClick={() => setDelGroup(null)}>
          <div className="ma-mod-card" onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: "92vw", padding: 22 }}>
            <div className="brand" style={{ fontSize: 19, fontWeight: 700 }}>Hapus grup?</div>
            <div style={{ fontSize: 13.5, color: "#6f6353", marginTop: 8, lineHeight: 1.5 }}>
              Grup <b>{delGroup.name}</b> beserta {delGroup.options.length} opsinya akan dihapus permanen.
            </div>
            <div style={{ display: "flex", gap: 11, marginTop: 20 }}>
              <button
                onClick={() => setDelGroup(null)}
                className="btn"
                style={{ flex: 1, padding: 12, borderRadius: 12, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteGroup}
                className="btn"
                style={{ flex: 1.3, padding: 12, borderRadius: 12, background: "var(--red)", color: "#fff" }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────── group card ───────────── */
function GroupCard({
  group,
  onEditGroup,
  onDeleteGroup,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onRecipeOption,
}: {
  group: ModGroupFull;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onAddOption: () => void;
  onEditOption: (o: ModOption) => void;
  onDeleteOption: (o: ModOption) => void;
  onRecipeOption: (o: ModOption) => void;
}): JSX.Element {
  return (
    <div className="owner-card" style={{ padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{group.name}</span>
          <span
            className="owner-pill"
            style={{
              background: group.type === "single" ? "var(--green-ok-bg)" : "#F1E6D6",
              color: group.type === "single" ? "var(--green-ok)" : "var(--coffee)",
            }}
          >
            {group.type === "single" ? "Pilih 1" : "Opsional"}
          </span>
          {group.categories.map((c) => (
            <span key={c} className="owner-pill" style={{ background: "var(--cream)", color: "var(--coffee)" }}>
              {c}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, flex: "0 0 auto" }}>
          <button className="ma-mod-iconbtn" onClick={onEditGroup} title="Edit grup" aria-label="Edit grup">
            <Icons.edit size={15} color="var(--green-800)" />
          </button>
          <button className="ma-mod-iconbtn ma-mod-danger" onClick={onDeleteGroup} title="Hapus grup" aria-label="Hapus grup">
            <Icons.trash size={15} color="var(--red)" />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
        {group.options.map((o) => (
          <div key={o.id} className="ma-mod-optrow">
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {o.def && (
                <span className="ma-mod-defbadge" title="Default">
                  <Icons.star size={11} color="var(--gold-700)" /> Default
                </span>
              )}
              <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.label}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
              {o.price === 0 ? (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--green-ok)" }}>Gratis</span>
              ) : (
                <span className="num" style={{ fontSize: 13.5, color: "var(--coffee)" }}>+{rupiah(o.price)}</span>
              )}
              <button className="ma-mod-recipebtn" onClick={() => onRecipeOption(o)} title="Resep bahan" aria-label="Resep bahan">
                <Icons.bag size={12} color="var(--coffee)" /> Resep
              </button>
              <button className="ma-mod-iconbtn ma-mod-sm" onClick={() => onEditOption(o)} title="Edit opsi" aria-label="Edit opsi">
                <Icons.edit size={13} color="var(--green-800)" />
              </button>
              <button
                className="ma-mod-iconbtn ma-mod-sm ma-mod-danger"
                onClick={() => onDeleteOption(o)}
                title="Hapus opsi"
                aria-label="Hapus opsi"
              >
                <Icons.trash size={13} color="var(--red)" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="ma-mod-addopt" onClick={onAddOption}>
        <Icons.plus size={14} color="var(--green-800)" /> Tambah Opsi
      </button>
    </div>
  );
}

/* ───────────── group editor ───────────── */
function GroupEditor({
  draft,
  onClose,
  onSaved,
}: {
  draft: GroupDraft;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [name, setName] = useState(draft.name);
  const [type, setType] = useState<ModType>(draft.type);
  const [categories, setCategories] = useState<Category[]>(draft.categories);
  const [saving, setSaving] = useState(false);

  const ok = name.trim().length > 0;

  function toggleCat(c: Category) {
    setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  async function save() {
    if (!ok || saving) return;
    setSaving(true);
    const values = { name: name.trim(), type, categories };
    try {
      if (draft.id) await updateModifierGroup(draft.id, values);
      else await createModifierGroup(values);
      onSaved();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="ma-mod-bd" onClick={onClose}>
      <div
        className="ma-mod-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 440, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", padding: 22 }}
      >
        <div className="brand" style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>
          {draft.id ? "Edit Grup" : "Tambah Grup Baru"}
        </div>

        <label style={labelStyle}>Nama Grup</label>
        <input
          className="fld"
          style={{ margin: "7px 0 15px" }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="cth. Ukuran"
          autoFocus
        />

        <label style={labelStyle}>Tipe Pilihan</label>
        <div style={{ display: "flex", gap: 10, margin: "7px 0 15px" }}>
          <button
            type="button"
            className={"ma-mod-toggle" + (type === "single" ? " on" : "")}
            onClick={() => setType("single")}
          >
            Pilih 1 (single)
          </button>
          <button
            type="button"
            className={"ma-mod-toggle" + (type === "multi" ? " on" : "")}
            onClick={() => setType("multi")}
          >
            Boleh banyak (multi)
          </button>
        </div>

        <label style={labelStyle}>Kategori Menu</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "7px 0 20px" }}>
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              className={"ma-mod-chip" + (categories.includes(c) ? " on" : "")}
              onClick={() => toggleCat(c)}
            >
              {categories.includes(c) && <Icons.check size={13} color="var(--cream)" />} {c}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 11 }}>
          <button
            type="button"
            onClick={onClose}
            className="btn"
            style={{ flex: 1, padding: 13, borderRadius: 13, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!ok || saving}
            className="btn btn-green"
            style={{ flex: 1.6, padding: 13, borderRadius: 13, opacity: ok && !saving ? 1 : 0.5, cursor: ok ? "pointer" : "default" }}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── option editor ───────────── */
function OptionEditor({
  draft,
  group,
  onClose,
  onSaved,
}: {
  draft: OptionDraft;
  group: ModGroupFull | null;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [label, setLabel] = useState(draft.label);
  const [price, setPrice] = useState<string>(draft.id != null ? String(draft.price) : "");
  const [def, setDef] = useState(draft.def);
  const [saving, setSaving] = useState(false);

  const isSingle = group?.type === "single";
  const priceNum = Number(price === "" ? 0 : price);
  const ok = label.trim().length > 0 && Number.isFinite(priceNum) && priceNum >= 0;

  async function save() {
    if (!ok || saving) return;
    setSaving(true);
    try {
      const makeDefault = isSingle && def;
      // For single groups, only one option may be default. Clear the previous
      // default client-side so exactly one stays marked.
      if (makeDefault && group) {
        const prev = group.options.find((o) => o.def && o.id !== draft.id);
        if (prev) await updateModifierOption(prev.id, { isDefault: false });
      }

      if (draft.id) {
        await updateModifierOption(draft.id, {
          label: label.trim(),
          price: priceNum,
          isDefault: isSingle ? def : false,
        });
      } else {
        await createModifierOption(draft.groupId, {
          label: label.trim(),
          price: priceNum,
          isDefault: makeDefault,
        });
      }
      onSaved();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="ma-mod-bd" onClick={onClose}>
      <div className="ma-mod-card" onClick={(e) => e.stopPropagation()} style={{ width: 400, maxWidth: "92vw", padding: 22 }}>
        <div className="brand" style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>
          {draft.id ? "Edit Opsi" : "Tambah Opsi"}
        </div>

        <label style={labelStyle}>Label</label>
        <input
          className="fld"
          style={{ margin: "7px 0 15px" }}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="cth. Large"
          autoFocus
        />

        <label style={labelStyle}>Harga Tambahan (Rp)</label>
        <input
          className="fld"
          style={{ margin: "7px 0 6px" }}
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
        />
        <div style={{ fontSize: 12, color: "#a99c86", marginBottom: 16 }}>Isi 0 untuk gratis.</div>

        {isSingle && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Switch on={def} onClick={() => setDef((v) => !v)} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {def ? "Jadi pilihan default" : "Jadikan default"}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 11 }}>
          <button
            type="button"
            onClick={onClose}
            className="btn"
            style={{ flex: 1, padding: 13, borderRadius: 13, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!ok || saving}
            className="btn btn-green"
            style={{ flex: 1.6, padding: 13, borderRadius: 13, opacity: ok && !saving ? 1 : 0.5, cursor: ok ? "pointer" : "default" }}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── scoped styles ───────────── */
function ModStyles(): JSX.Element {
  return (
    <style>{`
      .ma-mod-addbtn{border:none;cursor:pointer;border-radius:12px;padding:11px 16px;font-weight:700;font-size:13.5px;font-family:inherit;display:inline-flex;align-items:center;gap:7px;background:var(--green-800);color:var(--cream)}
      .ma-mod-note{margin-bottom:16px;padding:11px 15px;border-radius:13px;background:#FBF1DF;border:1px solid #ECCF9E;color:var(--orange-600);font-size:13px;font-weight:600}
      .ma-mod-iconbtn{width:32px;height:32px;border-radius:10px;border:1px solid var(--line);background:#fff;display:grid;place-items:center;cursor:pointer}
      .ma-mod-iconbtn:hover{background:var(--paper-2)}
      .ma-mod-iconbtn.ma-mod-sm{width:28px;height:28px;border-radius:8px}
      .ma-mod-recipebtn{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--cream-300);background:var(--cream);color:var(--coffee);font-family:inherit;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap}
      .ma-mod-recipebtn:hover{background:var(--cream-200)}
      .ma-mod-iconbtn.ma-mod-danger{border-color:var(--red-bg);background:var(--red-bg)}
      .ma-mod-optrow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:12px;background:var(--paper-2);border:1px solid var(--cream-200)}
      .ma-mod-defbadge{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:800;color:var(--gold-700);background:#FBF1DF;border:1px solid #ECCF9E;padding:2px 7px;border-radius:999px;white-space:nowrap}
      .ma-mod-addopt{margin-top:12px;border:1.5px dashed var(--cream-400);background:transparent;color:var(--green-800);cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;border-radius:11px;padding:9px 14px;display:inline-flex;align-items:center;gap:6px}
      .ma-mod-addopt:hover{background:var(--paper-2)}
      .ma-mod-bd{position:fixed;inset:0;background:rgba(28,20,12,.5);display:grid;place-items:center;z-index:80;animation:ma-mod-fade .18s}
      .ma-mod-card{background:#fff;border-radius:18px;box-shadow:0 30px 60px -24px rgba(0,0,0,.5);animation:ma-mod-pop .2s}
      .ma-mod-toggle{flex:1;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;padding:11px 10px;border-radius:11px;border:1.5px solid var(--line);background:#fff;color:#6f6353}
      .ma-mod-toggle.on{border-color:var(--green-700);background:var(--green-ok-bg);color:var(--green-ok)}
      .ma-mod-chip{cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--line);background:#fff;color:#6f6353;display:inline-flex;align-items:center;gap:5px}
      .ma-mod-chip.on{border-color:var(--green-800);background:var(--green-800);color:var(--cream)}
      @keyframes ma-mod-fade{from{opacity:0}}
      @keyframes ma-mod-pop{from{opacity:0;transform:translateY(8px) scale(.98)}}
    `}</style>
  );
}
