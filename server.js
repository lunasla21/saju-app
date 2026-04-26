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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/saju", async (req, res) => {
  try {
    const { name, year, month, day, hour, minute, gender } = req.body;

    const prompt = `
이름: ${name}
성별: ${gender}
생년월일시: ${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분

위 정보를 바탕으로 사주 리포트를 작성해줘.
구성:
1. 기본 성향
2. 오행 균형
3. 직업운
4. 재물운
5. 결혼운
6. 올해 흐름
7. 조언

한국어로 부드럽고 고급스럽게 작성해줘.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "너는 프리미엄 사주 리포트를 작성하는 전문가다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    res.json({
      result: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("사주 API 오류:", error);
    res.status(500).json({
      result: "서버 오류가 발생했습니다. Render 로그를 확인해주세요.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`서버 실행됨: ${PORT}`);
});
