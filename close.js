document.addEventListener('DOMContentLoaded', function () {
    const controls = document.getElementById('controls');
    const openButton = document.getElementById('open');
    const closeButton = document.getElementById('Close');

    // Function to open the controls panel
    function openControls() {
        controls.classList.add('open');
    }

    // Function to close the controls panel
    function closeControls() {
        controls.classList.remove('open');
    }

    // Event listener for the open button
    openButton.addEventListener('click', openControls);

    // Event listener for the close button
    closeButton.addEventListener('click', closeControls);

    // Keydown event listener for 'F' and 'Control'
    document.addEventListener('keydown', function (event) {
        if (event.key === 'f' || event.key === 'F' || event.key === 'Control') {
            openControls();
        }
    });
});