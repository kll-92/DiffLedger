import type { Receipt } from "./types.js";

const mark = (passed: boolean) => passed ? "PASS" : "FAIL";

export function renderConsole(receipt: Receipt): string {
  const lines = [
    `DiffLedger ${receipt.verdict.status}`,
    `Change Set  ${receipt.changeSet.summary.files} files, +${receipt.changeSet.summary.additions}/-${receipt.changeSet.summary.deletions}`,
    `Risk        ${receipt.risk.score}/100 (${receipt.risk.level})`,
    `Evidence    ${receipt.evidenceResults.filter((result) => result.status === "passed").length}/${receipt.evidenceResults.length} passed`,
    `Receipt     sha256:${receipt.integrity.digest.slice(0, 16)}...`
  ];
  for (const reason of receipt.verdict.reasons) lines.push(`- ${reason}`);
  return `${lines.join("\n")}\n`;
}

export function renderMarkdown(receipt: Receipt): string {
  const risks = receipt.risk.signals.length
    ? receipt.risk.signals.map((item) => `| ${item.code} | ${item.score} | ${item.message} |`).join("\n")
    : "| — | 0 | No Risk Signals detected. |";
  const evidence = receipt.evidenceResults.length
    ? receipt.evidenceResults.map((result) => `| ${result.checkId} | ${result.required ? "yes" : "no"} | ${result.status} | ${result.durationMs} ms |`).join("\n")
    : "| — | — | skipped | — |";
  return `# DiffLedger: ${mark(receipt.verdict.status === "PASS")}\n\n` +
    `- Change Set: ${receipt.changeSet.summary.files} files, +${receipt.changeSet.summary.additions}/-${receipt.changeSet.summary.deletions}\n` +
    `- Risk: ${receipt.risk.score}/100 (${receipt.risk.level})\n` +
    `- Receipt Digest: \`sha256:${receipt.integrity.digest}\`\n\n` +
    `## Risk Signals\n\n| Code | Score | Reason |\n| --- | ---: | --- |\n${risks}\n\n` +
    `## Evidence Results\n\n| Check | Required | Status | Duration |\n| --- | --- | --- | ---: |\n${evidence}\n\n` +
    `## Verdict Reasons\n\n${receipt.verdict.reasons.length ? receipt.verdict.reasons.map((reason) => `- ${reason}`).join("\n") : "- Policy satisfied."}\n`;
}
