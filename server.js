const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const OpenAI = require("openai");
const { Solar, Lunar } = require("lunar-javascript");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getSaju(year, month, day, hour, minute, calendarType = "solar") {
  let solar;

  if (calendarType === "lunar") {
    const lunarInput = Lunar.fromYmdHms(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute || 0),
      0
    );
    solar = lunarInput.getSolar();
  } else {
    solar = Solar.fromYmdHms(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute || 0),
      0
    );
  }

  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  return {
    year: eightChar.getYear(),
    month: eightChar.getMonth(),
    day: eightChar.getDay(),
    hour: eightChar.getTime(),
    solarDate: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, "0")}-${String(solar.getDay()).padStart(2, "0")}`,
    eightChar,
  };
}

function makeDaewoon(eightChar, gender) {
  try {
    const genderCode = gender === "남자" ? 1 : 0;
    const yun = eightChar.getYun(genderCode);
    const daYunList = yun.getDaYun();

    const list = daYunList.slice(1, 9).map((dy) => {
      const startAge = dy.getStartAge();
      const startYear = dy.getStartYear();
      const ganji = dy.getGanZhi();

      return {
        startAge,
        endAge: startAge + 9,
        ganji,
        startYear,
        endYear: startYear + 9,
      };
    });

    return {
      startInfo: `대운 시작: ${yun.getStartYear()}년 ${yun.getStartMonth()}개월 ${yun.getStartDay()}일 후 시작`,
      list,
    };
  } catch (error) {
    console.error("대운 계산 오류:", error);

    return {
      startInfo: "대운 계산 중 오류가 발생했습니다. 라이브러리 대운 API 확인이 필요합니다.",
      list: [],
    };
  }
}

async function handleAnalyze(req, res) {
  try {
    console.log("요청 데이터:", req.body);

    const { name, birth, time, gender, calendarType } = req.body;

    if (!name || !birth || !time || !gender) {
      return res.status(400).json({
        result: "입력값이 부족합니다.",
      });
    }

    const safeCalendar = calendarType || "solar";
    const [year, month, day] = birth.split("-");
    const [hour, minute] = time.split(":");

    const pillarsRaw = getSaju(year, month, day, hour, minute, safeCalendar);
    const daewoon = makeDaewoon(pillarsRaw.eightChar, gender);

    const pillars = {
      year: pillarsRaw.year,
      month: pillarsRaw.month,
      day: pillarsRaw.day,
      hour: pillarsRaw.hour,
      solarDate: pillarsRaw.solarDate,
    };

    const calendarLabel = safeCalendar === "lunar" ? "음력" : "양력";

    const prompt = `
이름: ${name}
성별: ${gender}
입력 기준: ${calendarLabel}
입력 생년월일: ${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분
양력 변환일: ${pillars.solarDate}

사주팔자:
년주: ${pillars.year}
월주: ${pillars.month}
일주: ${pillars.day}
시주: ${pillars.hour}

대운 정보:
${daewoon.startInfo}
${daewoon.list.map(d => `${d.startAge}세~${d.endAge}세: ${d.ganji}대운 (${d.startYear}년~${d.endYear}년)`).join("\n")}

이 사람의 사주를 "사주전쟁" 세계관 + 명리전 이론 기반으로 프리미엄 리포트 형태로 작성하라.

핵심 세계관:
- 사주 원국은 전쟁터다.
- 오행은 전장의 세력이다.
- 강한 오행은 이미 장악한 병력이다.
- 약한 오행은 지원이 필요한 전선이다.
- 지장간은 겉으로 드러나지 않은 숨겨진 아이템이다.
- 대운은 그 아이템을 켜는 스위치다.
- 세운은 아이템을 실제로 꺼내 쓰는 타이밍이다.
- 원국이 불리해도 지장간 아이템과 대운 스위치, 세운 타이밍이 맞으면 인생의 판이 바뀔 수 있다.
- 사람은 움직이고 도전할 때 자기 아이템을 현실에서 쓸 수 있다.
- 나쁜 사주는 있어도 쓸모없는 사주는 없다.

반드시 아래 구조로 작성하라.

1. 전장 배치, 원국 분석
2. 세력 분석, 오행 전쟁
3. 일간 캐릭터, 주인공 분석
4. 숨겨진 아이템, 지장간 분석
5. 대운 스위치
6. 세운 타이밍
7. 현실 번역
8. 전투 전략, 행동 가이드
9. 프리미엄 결론

작성 규칙:
- 한국어로 작성하라.
- 최소 4000자 이상 작성하라.
- 절대 짧게 요약하지 말라.
- 각 항목마다 최소 3문단 이상 작성하라.
- 단순히 좋다/나쁘다로 끝내지 말라.
- 판매용 프리미엄 리포트처럼 길고 깊게 작성하라.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "너는 명리학 기반으로 사주를 전쟁터, 병력, 지장간 아이템, 대운 스위치, 세운 타이밍의 세계관으로 해석하는 프리미엄 사주전쟁 리포트 작가다. 짧은 요약을 금지하고, 구조와 이유를 깊게 설명한다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 5000,
      temperature: 0.75,
    });

    res.json({
      result: completion.choices[0].message.content,
      pillars,
      daewoon,
      calendarType: safeCalendar,
    });
  } catch (error) {
    console.error("분석 오류:", error);
    res.status(500).json({
      result: "서버 오류가 발생했습니다. 터미널 로그를 확인해주세요.",
      error: error.message,
    });
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/analyze", handleAnalyze);
app.post("/api/saju", handleAnalyze);

app.listen(PORT, () => {
  console.log(`서버 실행됨: ${PORT}`);
});
