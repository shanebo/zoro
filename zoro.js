

/*
Issues:
1) if you try to delete from the first caret pos it won't walk
2) Firefox doesnt delete substrings on selections
3) when user focuses the input put the cursor at the first instance of a maskChar
*/
﻿
/*
Idea:
1) take the mask and strip out formatChars
2) as user types add valid chars against the stripped mask and set to a global var
3) each time a char is added to the global unformatted var run the formatter
4) make sure to keep the caret pos where the user has it
*/


var Zoro = (function(el, options) {
    'use strict';

    var formatChars = ['-', '_', '(', ')', '[', ']', ':', '.', ',', '$', '%', '@', ' ', '/'];
    var maskChars = ['A', '9', '*'];
    var forceUpper = options.forceUpper || false;
    var forceLower = options.forceLower || false;
    var mask = options.mask;
    var keys = {
        backSpace: 8,
        tab: 9,
        delete: 46,
        left: 37,
        up: 38,
        right: 39,
        down: 40,
        end: 35,
        shift: 16,
        control: 17,
        v: 86,
        c: 67,
        x: 88
    };

    if (options.placeHolder) {
        el.setAttribute('placeholder', options.placeHolder);
    }

    var stripMask = function(str){
        return str.split('').filter(function(char){
            return !(formatChars.indexOf(char) > -1);
        }).join('');
    }

    var applyMask = function(str, empty){
        var m = 0;
        return mask.split('').map(function(char, c){
            if (maskChars.indexOf(char) > -1) {
                var userChar = _unmaskedValue[m];
                m += 1;
                return userChar;
            } else {
                return char;
            }
        }).join('');
    }

    var getCaretPosition = function() {
        var pos = el.selectionStart < el.selectionEnd ? el.selectionStart : el.selectionEnd;
        // console.log(pos);
        return pos;
    }

/*
    var getCaretPosition = function() {
        var pos = 0;
        if (document.selection) {
            // IE Support
            el.focus();
            var sel = document.selection.createRange();
            sel.moveStart('character', - el.value.length);
            pos = sel.text.length;
        } else if (el.selectionStart || el.selectionStart == '0') {
            pos = el.selectionStart;
        }
        return pos;
    }
*/

    var setCaretPosition = function(index) {
        if (el.createTextRange) {
            var range = el.createTextRange();
            range.move('character', index);
            range.select();
        } else {
            if (el.selectionStart) {
                el.focus();
                el.setSelectionRange(index, index);
            } else {
                el.focus();
            }
        }
    }

    var getSelectionText = function() {
        var text = '';
        if (window.getSelection) {
            text = window.getSelection().toString();
        } else if (document.selection && document.selection.type != 'Control') {
            text = document.selection.createRange().text;
        }
        return text;
    }

    var isValidMaskChar = function(maskChar, char) {
        if (maskChar === '9' && /\d/.test(char)) {
            return true;
        }
        if (maskChar === 'A' && /^[a-zA-Z]+$/.test(char)) {
            return true;
        }
        return false;
    }

    var replaceAt = function(str, index, char) {
        return str.substr(0, index) + char + str.substr(index + char.length);
    }

    var insertChar = function(char, index) {
        if (forceUpper) char = char.toUpperCase();
        if (forceLower) char = char.toLowerCase();

        if (index < el.value.length) {
            // console.log('input is full so replace chars');
            el.value = replaceAt(el.value, index, char);
        } else {
            // console.log('input is NOT full so add chars');
            el.value = el.value.slice(0, index) + char + el.value.slice(index);
        }

        // setCaretPosition(index + 1);
    }

    var walkMask = function(char, index, key){
        // console.log('walkmask');
        if (!(index <= el.value.length)) return;

        var maskChar = mask.charAt(index);
        var isMaskChar = maskChars.indexOf(maskChar) > -1;
        var isFormatChar = formatChars.indexOf(maskChar) > -1;
        var formatAlreadyThere = isFormatChar && el.value.charAt(index) === maskChar;

        if (isMaskChar && isValidMaskChar(maskChar, char)) {
            // console.log('is valid char');
            insertChar(char, index);
            setCaretPosition(index + 1);
            walkMask(null, index + 1, key);

        } else if (formatAlreadyThere) {
            // console.log('format char is there');
            if (key !== keys.backSpace) setCaretPosition(index + 1);
            walkMask(char, index + 1, key);

        } else if (isFormatChar) {
            // console.log('is format char but its not there');
            insertChar(maskChar, index);
            setCaretPosition(index + 1);
            walkMask(char, index + 1, key);

        } else {
            // console.log('not valid and isnt format');
            // NOT: valid char, formatChar
            // walkMask(null, index + 1, key);
        }
    }

    // el.onfocus = function(e) {
    //     if (el.value.length === 0) {
    //         el.value = mask.split('').map(function(char){
    //             return (maskChars.indexOf(char) > -1) ? ' ' : char;
    //         }).join('');
    //         setTimeout(function() {
    //             setCaretPosition(0);
    //         }, 10);
    //     }
    // }

    el.onkeydown = function(e) {
        var key = e.which;
        var char = e.shiftKey ? String.fromCharCode(key).toUpperCase() : String.fromCharCode(key).toLowerCase();
        var cutCopyPasteKeys = [keys.v, keys.c, keys.x].indexOf(key) > -1 && e.ctrlKey;
        var movementKeys = [keys.up, keys.right, keys.down, keys.left, keys.tab].indexOf(key) > -1;
        var modifierKeys = e.ctrlKey || e.shiftKey;
        var deleteKeys = key === keys.backSpace || key === keys.delete;
        var selectedText = getSelectionText();
        var hasSelection = selectedText.length;
        var pos = getCaretPosition();

        if (cutCopyPasteKeys || movementKeys) {
//        if (cutCopyPasteKeys || movementKeys || modifierKeys) {
            return true;
        }

        if (hasSelection) {
            // console.log('selection that was replaced');
            // i need to check if it's a valid char or backspace before replacing
            var emptiedSelectedText = selectedText.replace(/[^\-_\(\),\[\]\:\.\•\,\$\%\@\ \/]/g, ' ');
            el.value = el.value.replace(selectedText, emptiedSelectedText);
            setCaretPosition(pos);

        } else if (key === keys.backSpace) {
            // console.log('backspace char');
            var item = el.value.charAt(pos - 1);
            var isFormatChar = formatChars.indexOf(item) > -1;
            if (!isFormatChar && pos > 0) {
                el.value = replaceAt(el.value, pos - 1, ' ');
            }
           setCaretPosition(pos - 1);

        } else if (key === keys.delete) {
            // console.log('delete char');
            var item = el.value.charAt(pos);
            var isFormatChar = formatChars.indexOf(item) > -1;
            if (!isFormatChar && pos + 1 <= mask.length) {
                el.value = replaceAt(el.value, pos, ' ');
            }
           setCaretPosition(pos + 1);
        }

        walkMask(char, pos, key);
        e.preventDefault();
        return false;
    }

    if (el.value.length) {
        var _unmaskedValue = stripMask(el.value);
        var maskedValue = applyMask(_unmaskedValue);
        el.value = maskedValue;
    }

});
