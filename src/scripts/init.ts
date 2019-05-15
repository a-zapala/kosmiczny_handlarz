interface ScoreRecord {
    nick: string;
    score: number;
}

class RankList {
    private data: ScoreRecord[];

    constructor(reset: boolean) {
        let init_string: string;
        if (reset) {
            init_string = `[
                                {
                                  "nick": "Magdalena",
                                  "score": 100
                                },
                                {
                                  "nick": "Andrzej",
                                  "score": 50
                                },
                                {
                                  "nick": "Huncwot",
                                  "score": 10
                                }
                             ]`;
            localStorage['rank_list'] = init_string;
        } else {
            init_string = localStorage['rank_list'];
        }
        this.data = JSON.parse(init_string) as ScoreRecord[];
    }

    loadRankList(): void {
        let list: HTMLDivElement = document.getElementById("scores") as HTMLDivElement;
        for (let i = 0; i < this.data.length && i < 10; i++) {
            let record: HTMLLIElement = document.createElement("li");
            record.classList.add("list_element");
            let divNick: HTMLDivElement = document.createElement("div");
            let divScore: HTMLDivElement = document.createElement("div");
            divNick.textContent = this.data[i].nick;
            divScore.textContent = this.data[i].score.toString();
            record.appendChild(divNick);
            record.appendChild(divScore);
            list.appendChild(record);
        }
    }

    addScore(result: ScoreRecord) : void {
        for (let i = 0; i < this.data.length; i++) {
           if(result.score >= this.data[i].score) {
               this.data.splice(i,0,result);
               break;
           }
        }
        localStorage['rank_list'] = JSON.stringify(this.data);
    }
}

let rank_list: RankList = new RankList(true);
window.addEventListener("load", function () {
    rank_list.loadRankList();
});