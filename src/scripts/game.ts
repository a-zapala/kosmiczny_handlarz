interface Posistion {
    x: number;
    y: number;
}

interface ShipItem {
    available: number;
    buy_price: number;
    sell_price: number;
}

class Planet {
    name: string;
    pos: Posistion;
    available_items: { [name: string]: ShipItem };
    ships: Ship[];

    constructor(name: string, json_obj: JSON) {
        this.ships = [];
        this.name = name;
        this.available_items = json_obj['available_items'];

        this.pos = {
            x: json_obj['x'],
            y: json_obj['y']
        };
    }

    //return cost
    trade(item: string, value: number): number {
        this.available_items[item].available += value;
        if (value >= 0) {
            return this.available_items[item].buy_price * value;
        } else {
            return this.available_items[item].sell_price * value;
        }
    }

    removeShip(ship: Ship) {
        for (let i = 0; i < this.ships.length; i++) {
            if (this.ships[i] === ship) {
                this.ships.splice(i, 1);
            }
        }
    }
}

interface Vector {
    x: number;
    y: number;
}

class Ship {
    name: string;
    pos: Posistion;

    cargo_hold_size: number;
    loading: number;
    item_on_board: { [item: string]: number };

    inWay: boolean;
    direction: undefined | Vector;
    speed: number;
    planet: undefined | Planet; //staying or going to

    constructor(name: string, cargo_hold_size: number, start_planet: Planet, items: string[]) {
        this.name = name;
        this.pos = {
            x: start_planet.pos.x,
            y: start_planet.pos.y
        };
        this.cargo_hold_size = cargo_hold_size;
        this.loading = 0;

        this.item_on_board = {};
        for (let i = 0; i < items.length; i++) {
            this.item_on_board[items[i]] = 0;
        }

        this.inWay = false;
        this.planet = start_planet;
        start_planet.ships.push(this);
        this.speed = 1;
    }

    trade(item: string, value: number) {
        this.loading += value;
        this.item_on_board[item] += value;
    }

    goToPlanet(planet: Planet) {
        if (planet != this.planet) {

            this.planet.removeShip(this);

            this.direction = {
                x: planet.pos.x - this.pos.x,
                y: planet.pos.y - this.pos.y
            } as Vector;

            let vec_len = Math.sqrt(Math.pow(this.direction.x, 2) + Math.pow(this.direction.y, 2));
            this.direction.x /= vec_len;
            this.direction.y /= vec_len; //unit vector

            this.direction.x *= this.speed;
            this.direction.y *= this.speed;

            this.inWay = true;
            this.planet = planet;
            view.moveShip(this);
        }
    }

    refreshPosition() {
        if (this.inWay) {
            this.pos.x += this.direction.x;
            this.pos.y += this.direction.y;

            //check if arrived
            let dist_to_planet: number = Math.sqrt(Math.pow(this.planet.pos.x - this.pos.x, 2) + Math.pow(this.planet.pos.y - this.pos.y, 2));
            console.log(this.name + " " + dist_to_planet.toString());
            if (dist_to_planet < this.speed) {
                this.planet.ships.push(this);
                this.inWay = false;
                this.direction = undefined;
                this.pos.x = this.planet.pos.x;
                this.pos.y = this.planet.pos.y;
                view.moveShip(this);
                view.refreshView();
            }
        }
    }
}

class Game {
    nick: string;

    game_duration: number;
    current_time: number;

    initial_credits: number;
    current_credits: number;

    items: string[];
    planets: { [name: string]: Planet };
    ships: { [name: string]: Ship };


    constructor(json_obj: JSON) {
        this.nick = localStorage['nick'];

        this.game_duration = json_obj['game_duration'];
        this.current_time = this.game_duration;

        this.initial_credits = json_obj['initial_credits'];
        this.current_credits = this.initial_credits;

        this.items = json_obj['items'];

        this.planets = {};
        for (let planet_name in json_obj['planets']) {
            this.planets[planet_name] = new Planet(planet_name, json_obj['planets'][planet_name]);
        }

        this.ships = {};
        for (let ship_name in json_obj['starships']) {
            let cargo_hold_size: number = json_obj['starships'][ship_name]['cargo_hold_size'];
            let start_planet: Planet = this.planets[json_obj['starships'][ship_name]['position']];
            this.ships[ship_name] = new Ship(ship_name, cargo_hold_size, start_planet, this.items);
        }

    }

    makeTrade(ship: Ship, item: string, value: number) {
        ship.trade(item, value);
        this.current_credits += ship.planet.trade(item, -value);
    }

    refreshShipsPosition() {
        for (let ship_name in this.ships) {
            if (this.ships[ship_name].inWay) {
                this.ships[ship_name].refreshPosition();
            }
        }
    }
}

class View {
    curr_ship: Ship | undefined;
    curr_planet: Planet | undefined;

    setPlanetInfo(planet: Planet): void {
        let name_lab: HTMLParagraphElement = document.querySelector('#planet_info .planet_name');
        name_lab.textContent = planet.name;

        let poz_lab: HTMLParagraphElement = document.querySelector('#planet_info .position');
        poz_lab.textContent = "Pozycja(" + planet.pos.x.toString() + "," + planet.pos.y.toString() + ")";
    }

    setPlanetItems(planet: Planet): void {
        let old_tbody: HTMLElement = document.querySelector("#planet_info .material tbody");
        let new_tbody: HTMLElement = document.createElement('tbody');

        for (let item in planet.available_items) {
            let row: HTMLTableRowElement = document.createElement('tr');

            let it_name: HTMLTableDataCellElement = document.createElement('td');
            let it_avail: HTMLTableDataCellElement = document.createElement('td');
            let it_buy_price: HTMLTableDataCellElement = document.createElement('td');
            let it_sell_price: HTMLTableDataCellElement = document.createElement('td');

            it_name.textContent = item;
            it_avail.textContent = planet.available_items[item].available.toString();
            it_buy_price.textContent = planet.available_items[item].buy_price.toString();
            it_sell_price.textContent = planet.available_items[item].sell_price.toString();

            row.appendChild(it_name);
            row.appendChild(it_avail);
            row.appendChild(it_buy_price);
            row.appendChild(it_sell_price);
            new_tbody.appendChild(row);
        }
        old_tbody.parentNode.replaceChild(new_tbody, old_tbody);
    }

    setPlanetShip(planet: Planet): void {
        let old_ship_list: HTMLDivElement = document.querySelector('#ships_on_planet .list');
        let new_ship_list: HTMLDivElement = document.createElement('div');

        new_ship_list.classList.add('list', 'scrolling');
        new_ship_list.addEventListener('click', controller.openShip);

        for (let i = 0; i < planet.ships.length; i++) {
            let div_el: HTMLDivElement = document.createElement('div');
            div_el.classList.add('list_element');

            let b_el: HTMLButtonElement = document.createElement('button');
            div_el.appendChild(b_el);
            b_el.classList.add('ship_button', 'button');
            b_el.addEventListener('click', controller.openShip);
            b_el.textContent = planet.ships[i].name;
            new_ship_list.appendChild(div_el);
        }
        old_ship_list.parentNode.replaceChild(new_ship_list, old_ship_list);
    }

    setPlanet(planet: Planet): void {
        this.curr_planet = planet;
        this.setPlanetInfo(planet);
        this.setPlanetItems(planet);
        this.setPlanetShip(planet);
    }

    showPlanet(planet: Planet): void {
        this.setPlanet(planet);
        const popup = document.getElementById("planet_info");
        popup.classList.remove('hide');
    }

    setShipInfo(ship: Ship) {
        let name_lab: HTMLParagraphElement = document.querySelector('#ship_info .ship_name');
        name_lab.textContent = ship.name;

        let desc_lab: HTMLParagraphElement = document.querySelector('#ship_info .ship_desc');
        if (ship.inWay) {
            desc_lab.textContent = "Go to " + ship.planet.name;
        } else {
            desc_lab.textContent = ship.planet.name;
        }

        let load_lab: HTMLParagraphElement = document.querySelector('#ship_info .ship_load');
        load_lab.textContent = "Ladunek: " + ship.loading.toString() + "/" + ship.cargo_hold_size.toString();
    }

    setShipItems(ship: Ship) {
        let old_tbody: HTMLElement = document.querySelector("#ship_info .material tbody");
        let new_tbody: HTMLElement = document.createElement('tbody');

        for (let item in ship.item_on_board) {
            let row: HTMLTableRowElement = document.createElement('tr');
            let it_name: HTMLTableDataCellElement = document.createElement('td');
            let it_load: HTMLTableDataCellElement = document.createElement('td');

            it_name.textContent = item;
            it_load.textContent = ship.item_on_board[item].toString();

            row.appendChild(it_name);
            row.appendChild(it_load);

            if (!ship.inWay) {
                let it_form: HTMLTableDataCellElement = document.createElement('td');
                if (ship.planet.available_items.hasOwnProperty(item)) {
                    it_form.appendChild(this.createItemForm(item, ship, ship.planet));
                }
                row.appendChild(it_form);
            }
            new_tbody.appendChild(row);
        }
        old_tbody.parentNode.replaceChild(new_tbody, old_tbody);
    }

    setShip(ship: Ship) {
        this.curr_ship = ship;
        this.setShipInfo(ship);
        this.setShipItems(ship);
    }

    showShip(ship: Ship) {
        this.setShip(ship);
        const popup = document.getElementById("ship_info");
        popup.classList.remove('hide');
    }

    moveShip(ship: Ship) {
        let rows: NodeListOf<Element> = document.querySelectorAll("#ships_list button");
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].textContent == ship.name) {
                let desc = rows[i].parentElement.nextElementSibling;
                if (ship.inWay) {
                    desc.textContent = "Go to " + ship.planet.name;
                } else {
                    desc.textContent = ship.planet.name;
                }
                break;
            }
        }
    }

    createItemForm(item_name: string, ship: Ship, planet: Planet): HTMLFormElement {
        let form: HTMLFormElement = document.createElement('form');

        let neutral_val: number = 0;
        let min_val: number = ship.item_on_board[item_name] * -1;

        let max_val: number = Math.floor(game.current_credits / planet.available_items[item_name].sell_price);
        max_val = Math.min(max_val, planet.available_items[item_name].available, ship.cargo_hold_size - ship.loading);

        let slider: HTMLInputElement = document.createElement('input');
        slider.setAttribute("type", "range");
        slider.setAttribute("class", "slider");
        slider.setAttribute("name", "amountRange");
        slider.setAttribute("min", min_val.toString());
        slider.setAttribute("max", max_val.toString());
        slider.setAttribute("value", "0");
        slider.setAttribute("oninput", "this.form.amountInput.value=this.value");
        form.appendChild(slider);

        let number: HTMLInputElement = document.createElement('input');
        number.setAttribute("type", "number");
        number.setAttribute("class", "chosen_number");
        number.setAttribute("item_name", item_name);
        number.setAttribute("ship_name", ship.name);
        number.setAttribute("name", "amountInput");
        number.setAttribute("min", min_val.toString());
        number.setAttribute("max", max_val.toString());
        number.setAttribute("value", neutral_val.toString());
        number.setAttribute("oninput", "this.form.amountRange.value=this.value");
        form.appendChild(number);

        let button: HTMLButtonElement = document.createElement('button');
        button.setAttribute("type", "submit");
        button.setAttribute("class", "submit_button");
        let icon: HTMLElement = document.createElement('i');
        icon.classList.add('fas', 'fa-money-bill-alt');
        button.appendChild(icon);
        form.appendChild(button);
        form.addEventListener('submit', controller.buyItems);

        return form;
    }

    setPlayerInfo(): void {
        this.setNick();
        this.setBalance();
        this.setTime();
    }

    setBalance(): void {
        let balance_lab: HTMLParagraphElement = document.querySelector('#balance');
        balance_lab.textContent = game.current_credits.toString();
    }

    setNick(): void {
        let nick_lab: HTMLParagraphElement = document.querySelector('#nick');
        nick_lab.textContent = game.nick;
    }

    setTime(): void {
        let time_lab: HTMLParagraphElement = document.querySelector('#time');
        time_lab.textContent = "Czas: " + game.current_time + " sec";
    }

    refreshView() {
        this.setPlayerInfo();

        if (this.curr_ship != undefined) {
            view.setShip(this.curr_ship);
        }
        if (this.curr_planet != undefined) {
            view.setPlanet(this.curr_planet);
        }
    }
}

class Controller {
    static closePopUp(event: Event): void {
        let cur_el = event.currentTarget as Element;
        let tar_el = event.target as Element;
        let pop_up_name: string = cur_el.getAttribute('id');

        if (tar_el.classList.contains("close")) {
            if (pop_up_name == 'ship_info') {
                view.curr_ship = undefined;
            }

            if (pop_up_name == 'planet_info') {
                view.curr_planet = undefined;
            }

            cur_el.classList.add('hide');
        }
    }

    openPlanet(event: Event): void {
        let pl_but = event.target as HTMLButtonElement;
        if (pl_but.tagName == 'BUTTON') {
            let planet_name: string = pl_but.textContent.toString().trim();
            let planet: Planet = game.planets[planet_name];
            view.showPlanet(planet);
        }
    }

    openShip(event: Event): void {
        let sh_but = event.target as HTMLButtonElement;
        if (sh_but.tagName == 'BUTTON') {
            let ship_name: string = sh_but.textContent.toString().trim();
            let ship: Ship = game.ships[ship_name];
            view.showShip(ship);
        }
    }

    buyItems(ev: Event): void {
        ev.preventDefault();

        let form: HTMLFormElement = ev.target as HTMLFormElement;
        let input: HTMLInputElement = form.elements.item(1) as HTMLInputElement;
        let item: string = input.getAttribute('item_name');

        game.makeTrade(view.curr_ship, item, input.valueAsNumber);
        view.refreshView();
    }

    goToPlanet(ev: Event): void {
        let pl_but = event.target as HTMLButtonElement;
        let planet_name: string = pl_but.textContent.toString().trim();
        let planet: Planet = game.planets[planet_name];
        view.curr_ship.goToPlanet(planet);
        view.refreshView();
    }

    tick() {
        let refresh: number = 1000;
        setTimeout(this.timer, refresh);
    }

    timer() {
        view.setTime();
        if (game.current_time == 0) {
            controller.endGame();
        }
        game.current_time--;
        game.refreshShipsPosition();
        controller.tick();
    }

    endGame() {
        let score: ScoreRecord = {
            nick: game.nick,
            score: game.current_credits
        };
        rank_list.addScore(score);
        window.location.href = "index.html";
    }
}

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

    addScore(result: ScoreRecord): void {
        for (let i = 0; i < this.data.length; i++) {
            if (result.score >= this.data[i].score) {
                this.data.splice(i, 0, result);
                break;
            }
        }
        localStorage['rank_list'] = JSON.stringify(this.data);
    }

    openLogin(): void {
        let popup: HTMLElement = document.getElementById("start_popup");
        popup.classList.remove('hide');
    }

    start(): void {
        let login_box: HTMLInputElement = document.getElementById("login_box") as HTMLInputElement;
        localStorage['nick'] = login_box.value;
        window.location.href = "board.html";
    }

}

let rank_list = new RankList(false);
let game = new Game(JSON.parse(initial_data));
let view = new View();
let controller = new Controller();


