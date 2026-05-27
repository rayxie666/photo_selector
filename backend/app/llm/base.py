"""LLM provider abstraction.

Every provider implements `critique()` returning a structured aesthetic critique.
Cloud providers receive an API key; the local Claude Code CLI provider does not.
"""

from __future__ import annotations

from typing import Literal, Protocol

from pydantic import BaseModel, Field


ProviderId = Literal["openai", "anthropic", "google", "claude-cli"]


class CritiqueResult(BaseModel):
    """Structured aesthetic critique returned by an LLM."""

    score: float = Field(ge=0, le=10, description="Holistic aesthetic score in [0, 10].")
    composition: str = Field(description="Composition observations (1-3 sentences).")
    style: str = Field(description="Style and visual treatment (1-3 sentences).")
    suggestion: str = Field(description="Specific improvement suggestion or strength to keep.")
    reasons: list[str] = Field(
        default_factory=list,
        description=(
            "1-3 short flaw labels (each <= 12 characters) suitable for a badge. "
            "Empty list when the photo has no notable flaws."
        ),
    )


class LLMProvider(Protocol):
    id: ProviderId
    requires_api_key: bool

    async def critique(self, *, image_bytes: bytes, language: str = "en") -> CritiqueResult:
        """Return a structured critique for a single image."""
        ...

    async def health(self) -> tuple[bool, str | None]:
        """Return (available, reason_if_unavailable)."""
        ...


# Shared prompt skeleton — providers may add format-specific scaffolding around this.
CRITIQUE_PROMPT_EN = """You are a ruthless senior photo editor and mentor running a portfolio critique. The photographer wants to grow, so flattery does not help them. Be direct, specific, and useful — never polite.

Score calibration (be strict, do NOT inflate):
- 0-3: technical or content failure — skip
- 4-5: ordinary snapshot, no reason to keep
- 6-7: solid frame, has at least one strong element
- 8-9: portfolio-grade, would publish
- 10: rare, masterwork

For every text field, NAME THE WEAKNESS FIRST. When relevant, call out focus (front/back-focus, motion blur, soft subject), composition (subject placement, balance, dead space, leading lines, distracting elements), and tone/color (flat light, muddy midtones, color cast, clipped highlights, crushed shadows). Forbidden words: "lovely", "nice", "interesting", "decent", "not bad" and other padding. No "consider trying" — state the fix directly.

Return JSON:
- score: 0-10 number (decimals allowed) per the calibration above
- composition: 1-3 sentences naming the concrete composition flaw, e.g. "Subject buried dead-center with empty space above; no leading line drawing the eye in; the bright window in the upper left steals attention." If composition is genuinely strong, say what works and why.
- style: 1-3 sentences on color/tone/light. Point at specific defects: flat shadow-less front light, sickly green cast in skin tones, blown sky, crushed blacks, etc.
- suggestion: ONE concrete fix or reshoot direction — not generic platitudes.
- reasons: 1-3 short Chinese labels (each ≤ 6 chars), e.g. ["主体不清", "构图死板", "色彩平淡", "光线生硬", "失焦", "曝光过度", "影调单一", "前景杂乱"]. Use [] only for 8+ photos.

Output ONLY the JSON object — no markdown fences, no preamble, no closing remarks.
"""

CRITIQUE_PROMPT_ZH = """你是一位**严苛的资深摄影导师**，正在做作品集 crit（像摄影学院终评）。摄影师想进步，恭维对他没帮助。请直接、具体、有用——不要客气。

**评分尺度（严格执行，绝不放水）：**
- 0-3：技术或内容硬伤，直接淘汰
- 4-5：普通快照，没有保留价值
- 6-7：扎实，至少一处亮点
- 8-9：可入作品集，可以发表
- 10：极少，神作

每个字段**先点缺陷，再谈优点**。涉及对焦（前焦/后焦/动态模糊/主体不实）、构图（主体位置、平衡、留白、引导线、干扰元素）、色调（平光、灰浊中间调、偏色、高光溢出、暗部死黑）时，必须明确指出问题点。

**禁用词**："挺好""不错""有点意思""还行""值得保留"等空话；禁用"可以考虑..."这种含糊建议，直接说怎么改。

请返回 JSON：
- score: 按上述尺度的 0-10 分数（可小数）
- composition: 1-3 句具体指出构图问题，例如"主体被埋在死板正中央，上方大片留空浪费，没有任何引导视线的线条，左上的亮窗户分散注意力"。构图真正出色时，说清强在哪。
- style: 1-3 句评价色彩、影调、光线。点名具体缺陷：正面平光无层次、肤色偏青、天空高光溢出、暗部死黑等。
- suggestion: 一条具体修改方向或重拍建议（拒绝套话）。
- reasons: 1-3 条**极简**淘汰理由（每条 ≤ 6 个汉字）：例如 ["主体不清", "构图死板", "色彩平淡", "光线生硬", "失焦", "曝光过度", "影调单一", "前景杂乱"]。8 分以上照片返回 []。

只输出 JSON 对象，不要 markdown 包裹，不要前言或结语。
"""


def prompt_for(language: str) -> str:
    return CRITIQUE_PROMPT_ZH if language.lower().startswith("zh") else CRITIQUE_PROMPT_EN
