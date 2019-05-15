function openLogin(): void {
    let popup: HTMLElement = document.getElementById("start_popup");
    popup.classList.remove('hide');

}

function closePopUp(event: Event): void {
    let cur_el = event.currentTarget as Element;
    let tar_el = event.target as Element;
    if (tar_el.classList.contains("close")) {
        cur_el.classList.add('hide');
    }
}
