# BF6 weekday activity

Use `bf6 days --help` (also `bf6 days help` or `bf6 days -h`) for in-bot
parameter descriptions and examples. The main BF6 command list points to this help.

- `bf6 days`: group report for the last 90 days.
- `bf6 days 30d`: group report for the last 30 days.
- `bf6 days <player> 90d`: individual report; player names may contain spaces.
- `bf6 days --all`: all stored history, starting from the earliest snapshot.
- `bf6 days --all --records`: all-time records; also works with a player name.
- A trailing `all` is also accepted instead of `--all`.
- Aliases: `bf6 weekdays`, `bf6 activity`. Windows support 1–3650 days.

Uses stored history only, without refreshing upstream stats or adding tables.
Each report attaches a Monday–Sunday bar chart of average hours, with the busiest
weekday highlighted in green and activity frequency labels below each bar.
Reports contain only the graph; rendering failures return a short error message.
Use `bf6 days --records` (or `bf6 days [player] [30d] --records`) for a separate
records image instead of the weekday chart. It shows busiest actual day, calendar week (Monday–Sunday), and month,
separately ranked by total hours and distinct active players. Each record shows
both values; players are deduplicated over the entire period, not summed across
dates. Records use only activity inside the selected window. Partial periods are
marked with `*`; ties show the earliest period and the number of other tied periods.
All weekday boundaries use UTC. Bars show average player-hours
per occurrence, with estimated active players per occurrence below each bar.
For an individual, averages and `Active %` use only dates covered by accepted
intervals: for example, 75% means activity on approximately 75% of the observed
dates for that weekday. Dates before tracking and missing/invalid intervals are
not assumed to be inactivity. Valid unchanged counters do count as observations.
Each observed date counts once, even if only part of it is observed. A weekday
without observations displays `No coverage`, not 0% activity.
Group reports retain calendar-window averages and average players instead.
Group occurrences include days with no recorded activity, so missing history can
lower averages; partial boundary dates count proportionally. Group hours are
summed player-hours, not hours spent playing simultaneously.

Both images show coverage in two ways: the percentage of tracked player-time
covered by accepted intervals, and the number/percentage of accepted intervals.
Tracked player-time starts at the later of each player's first snapshot and the
selected window's start, and runs to the window's end. Time before tracking is
excluded; gaps, invalid intervals and time after the last snapshot reduce time
coverage. A high interval acceptance rate alone does not imply good coverage.
Coverage describes observations, not confidence in exact session timestamps.

Playtime is estimated by subtracting consecutive cumulative snapshots. The first
snapshot is a baseline, never a lifetime-hours contribution. Intervals crossing
UTC midnight distribute hours proportionally over elapsed time, not actual
session timestamps. This also makes active-player counts estimates. Multiple
observations for one player on one date count only once.

Intervals longer than 24 hours remain unassigned and their estimated hours are
shown separately. Negative deltas, provider changes and deltas exceeding elapsed
wall time are excluded. The latest snapshot before the requested window is loaded
as a baseline; intervals crossing the start are clipped proportionally. Activity
after the latest stored snapshot is unknown.
