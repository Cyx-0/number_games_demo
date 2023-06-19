
enum OpCode {
	START = 1,
	QUESTION = 2,
    RESPONSE = 3,
    PASS = 4,
    REJECTED = 5,
    DONE = 6
}

interface MessageMatchStart{
    speaker: string
    score: {[id:string]:string}
    message?: string
}

interface QuestionReq{
    question: string
}

interface QuestionMessageResp {
    speaker: string
    currentQuestion: string,
    message?: string
}

interface ResponseReq {
    response: string
}

interface ResponseMessageResp {
    speaker: string
    currentQuestion: string | null
    respondent: string | null
    currentResponse: string | null
    score: { [id: string]: string }
    success: boolean
    message? :string
}

interface PassMessageResp {
    speaker: string
}

interface DoneMessageResp {
    winner: string
    score: { [id: string]: string }
}