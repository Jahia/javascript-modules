console.log('Executing head script...');
document.addEventListener('DOMContentLoaded', function () {
    var newDiv = document.createElement('div');
    newDiv.id = 'testHeadElement';
    document.body.appendChild(newDiv);
});
