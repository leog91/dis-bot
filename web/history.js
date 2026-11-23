function initHistory(form) {
    const results = document.querySelector("#history-results");
    const status = document.querySelector("#history-status");
    const apply = form.querySelector('button[type="submit"]');
    let pending;

    apply.hidden = true;
    form.addEventListener("change", async () => {
        pending?.abort();
        const request = new AbortController();
        pending = request;
        const params = new URLSearchParams(new FormData(form));
        status.textContent = "Updating history…";
        results.setAttribute("aria-busy", "true");
        try {
            const response = await fetch(`/player/history?${params}`, { signal: request.signal });
            if (!response.ok) throw new Error("Could not load history");
            const html = await response.text();
            if (request.signal.aborted) return;
            const detailsOpen = results.querySelector("details")?.open;
            results.innerHTML = html;
            const details = results.querySelector("details");
            if (details && detailsOpen) details.open = true;
            window.history.replaceState(null, "", `/player?${params}#history`);
            status.textContent = "History updated.";
            apply.hidden = true;
        } catch {
            if (request.signal.aborted) return;
            status.textContent = "Could not update history. The previous chart is still shown. Try Apply to reload.";
            apply.hidden = false;
        } finally {
            if (pending === request) {
                results.removeAttribute("aria-busy");
                pending = undefined;
            }
        }
    });
}

const form = document.querySelector("#history form");
if (form) initHistory(form);

for (const filter of document.querySelectorAll("form[data-auto-submit]")) {
    filter.querySelector('button[type="submit"]').hidden = true;
    filter.addEventListener("change", event => {
        if (event.target instanceof HTMLSelectElement) filter.requestSubmit();
    });
}

function inspectPoint(point) {
    const chart = point.closest(".history-chart");
    chart.querySelector("[data-chart-point].selected")?.classList.remove("selected");
    point.classList.add("selected");
    chart.querySelector("[data-chart-caption]").textContent = "Snapshot:";
    chart.querySelector("[data-chart-readout]").textContent = point.dataset.chartPoint;
}

function inspectTarget(event) {
    const point = event.target.closest("[data-chart-point]");
    if (point) inspectPoint(point);
}

document.addEventListener("pointerover", inspectTarget);
document.addEventListener("click", inspectTarget);
document.addEventListener("keydown", event => {
    const plot = event.target.closest("[data-chart-plot]");
    if (!plot || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const points = Array.from(plot.querySelectorAll("[data-chart-point]"));
    const current = points.findIndex(point => point.classList.contains("selected"));
    const index = event.key === "Home" ? 0 : event.key === "End" ? points.length - 1
        : Math.max(0, Math.min(points.length - 1, current + (event.key === "ArrowLeft" ? -1 : 1)));
    const point = points[index];
    inspectPoint(point);
    const bounds = plot.getBoundingClientRect();
    const marker = point.getBoundingClientRect();
    if (marker.left < bounds.left) plot.scrollLeft -= bounds.left - marker.left + 12;
    if (marker.right > bounds.right) plot.scrollLeft += marker.right - bounds.right + 12;
});

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

document.addEventListener("click", event => {
    const button = event.target.closest("button[data-sort-column]");
    if (!button) return;
    const header = button.closest("th");
    const table = header.closest("table");
    const body = table.tBodies[0];
    const column = header.cellIndex;
    const numeric = button.dataset.sortColumn === "number";
    const current = header.getAttribute("aria-sort");
    const ascending = current ? current === "descending" : !numeric;
    const direction = ascending ? 1 : -1;
    const rows = Array.from(body.rows, row => ({
        row,
        value: numeric ? row.cells[column].dataset.sortValue : row.cells[column].textContent,
    }));
    rows.sort((a, b) => {
        if (a.value === "" || b.value === "") return Number(a.value === "") - Number(b.value === "");
        return direction * (numeric ? Number(a.value) - Number(b.value) : collator.compare(a.value, b.value));
    });
    table.querySelector("th[aria-sort]")?.removeAttribute("aria-sort");
    header.setAttribute("aria-sort", ascending ? "ascending" : "descending");
    for (const { row } of rows) body.append(row);
});
