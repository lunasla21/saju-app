const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function makeSimplePillars(year, month, day, hour) {
  const stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const h = Number(hour);

  return {
    year: stems[(y - 4) % 10] + branches[(y - 4) % 12],
    month: stems[(y + m) % 10] + branches[(m + 1) % 12],
    day: stems[(y + m + d) % 10] + branches[(y + m + d) % 12],
    hour: stems[(d + h) % 10] + branches[Math.floor((h + 1) / 2) % 12],
  };
}

async function handleAnalyze(req, res) {
  try {
    const { name, birth, time, gender } = req.body;

    const [year, month, day] = birth.split("-");
    const [hour, minute] = time.split(":");

    const pillars = makeSimplePillars(year, month, day, hour);

    const prompt = `
이름: ${name}
성별: ${gender}
생년월일시: ${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분

사주팔자:
년주 ${pillars.year}
월주 ${pillars.month}
일주 ${pillars.day}
시주 ${pillars.hour}

위 정보를 바탕으로 프리미엄 사주 리포트를 작성해줘.

구성:
1. 기본 성향
2. 오행 흐름
3. 신강신약 관점
4. 직업운
5. 재물운
6. 결혼운
7. 올해 흐름
8. 현실 조언

한국어로 고급스럽고 상담문처럼 작성해줘.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "너는 프리미엄 사주 리포트를 작성하는 명리 상담 전문가다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    res.json({
      result: completion.choices[0].message.content,
      pillars,
      daewoon: {
        startInfo: "대운 계산은 현재 테스트 버전입니다.",
        list: [
          { startAge: 5, endAge: 14, ganji: "갑자", startYear: Number(year) + 5, endYear: Number(year) + 14 },
          { startAge: 15, endAge: 24, ganji: "을축", startYear: Number(year) + 15, endYear: Number(year) + 24 },
          { startAge: 25, endAge: 34, ganji: "병인", startYear: Number(year) + 25, endYear: Number(year) + 34 },
          { startAge: 35, endAge: 44, ganji: "정묘", startYear: Number(year) + 35, endYear: Number(year) + 44 },
          { startAge: 45, endAge: 54, ganji: "무진", startYear: Number(year) + 45, endYear: Number(year) + 54 },
        ],
      },
    });
  } catch (error) {
    console.error("분석 오류:", error);
    res.status(500).json({
      result: "서버 오류가 발생했습니다. OPENAI_API_KEY 또는 서버 코드를 확인해주세요.",
    });
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 기존 고급 index.html용
app.post("/analyze", handleAnalyze);

// 혹시 이전 index.html이 남아있을 때도 작동하게
app.post("/api/saju", handleAnalyze);

app.listen(PORT, () => {
  console.log(`서버 실행됨: ${PORT}`);
});
