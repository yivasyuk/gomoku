///Requires jquery nad jquery.cookie libraries

var Gomoku = function (boardSize, containerId) {
    var self = this;

    if (!boardSize)
        boardSize = 600;

    ///default settings (single contructor parameter)
    /*settings = {
        boardSize: 15,
        containerId: 'body',
        professionalRules: true,
        saveState: true
    }
    */
    this.settings = {};

    if ($.isPlainObject(boardSize)) {
        this.settings = boardSize;

        boardSize = this.settings.boardSize;
        containerId = this.settings.containerId;
    }

    this.lineColor = '#40353B';
    this.borderColor = '#40353B';
    this.backGroundColor = '#f9f7f0';
    this.highlightColor = '#ced1d4';
    this.highlightRestrictedColor = '#e9a5a7';

    this.blackFigureStopColor1 = '#dcdee0';
    this.blackFigureStopColor2 = '#0b101d';
    this.blackHighlightedFigureStopColor2 = '#8e251a';

    this.whiteFigureStopColor1 = '#ffffff';
    this.whiteFigureStopColor2 = '#94a1ad';
    this.whiteHighlightedFigureStopColor2 = '#e87064';

    var BoardCell = function (left, top, size, indexX, indexY) {
        this.left = left;
        this.top = top;
        this.size = size;
        this.indexX = indexX;
        this.indexY = indexY;
        this.isBlack = null;
        this.isRestricted = false;
        this.highlighted = false;

        this.isEmpty = function () { return this.isBlack == null; };

        this.draw = function (isBlack, highlighted) {
            this.clear();

            if (isBlack != undefined)
                this.isBlack = isBlack;
            if (highlighted == undefined)
                highlighted = false;

            var circleX = this.left + this.size / 2;
            var circleY = this.top + this.size / 2;
            var radius = this.size / 2.4;

            var stopColor1, stopColor2;
            if (this.isBlack) {
                stopColor1 = self.blackFigureStopColor1;
                stopColor2 = !highlighted ? self.blackFigureStopColor2 : self.blackHighlightedFigureStopColor2;
            }
            else {
                stopColor1 = self.whiteFigureStopColor1;
                stopColor2 = !highlighted ? self.whiteFigureStopColor2 : self.whiteHighlightedFigureStopColor2;
            }

            var gradient = self.ctx.createRadialGradient(circleX, circleY, 0, circleX, circleY, radius / 1.1);
            gradient.addColorStop(0, stopColor1);
            gradient.addColorStop(1, stopColor2);

            self.ctx.beginPath();
            self.ctx.fillStyle = gradient;
            self.ctx.arc(circleX, circleY, radius, 0, 2 * Math.PI);
            self.ctx.fill();
            self.ctx.closePath();
        };

        this.toggleFigureHighlight = function () {
            this.draw(this.isBlack, this.highlighted = !this.highlighted);
        };

        this.clear = function () {
            self.ctx.fillStyle = self.backGroundColor;
            self.ctx.fillRect(this.left, this.top, this.size, this.size);
            this.isBlack = null;
            this.highlighted = false;
        };

        this.highlight = function () {
            self.ctx.fillStyle = !this.isRestricted ? self.highlightColor : self.highlightRestrictedColor;
            self.ctx.fillRect(this.left, this.top, this.size, this.size);
        };
    };

    this.$board = null;
    this.containerId = containerId;
    this.boardSize = boardSize;
    this.ctx = null;
    this.cells = 15;
    this.lineWidth = 2;
    this.cellSize = null;
    this.board = null;
    this.moves = new Array();
    this.gameOver = false;
    this.highlightedCell = null;
    this.storedMoves = null;

    this.saveState = function () {
        if (!this.settings.saveState)
            return;
        
        var storedMoves = new Array();
        $(this.moves).each(function (index, boardCell) {
            storedMoves.push({ x: boardCell.indexX, y: boardCell.indexY });
        });

        $.cookie('gomoku',
            {
                settings: this.settings,
                moves: storedMoves
            }, { expires: 30 });
    };

    this.loadState = function () {
        var state = $.cookie('gomoku');
        if (!state)
            return;

        if (state.settings)
            this.settings = state.settings;

        if (state.moves)
            this.storedMoves = state.moves;
    };

    this.getSettingsValue = function (value, defaultValue) {
        return value == undefined || value == null ? defaultValue : value;
    };

    this.init = function () {
        $.cookie.json = true;

        this.loadState();
        this.settings.professionalRules = this.getSettingsValue(this.settings.professionalRules, true);
        this.settings.saveState = this.getSettingsValue(this.settings.saveState, true);

        this.cellSize = (this.boardSize - (this.cells - 1) * this.lineWidth) / this.cells;

        var $container = this.containerId ? $('#' + this.containerId) : $('body');
        $container.append('<canvas id="gomokuBoard" width="' + this.boardSize + '" height="' + this.boardSize + '"></canvas>');
        this.$board = $('#gomokuBoard');
        this.$board.css('background-color', this.backGroundColor)
            .css('cursor', 'pointer')
            .css('border', 'solid 3px ' + this.borderColor)
            .css('border-radius', '5px')
            .css('box-shadow', '4px 4px 6px #a9a2a7');

        this.ctx = this.$board[0].getContext('2d');

        this.drawBoard();

        var offsetX = 0;
        this.board = new Array(this.cells);
        for (var i = 0; i < this.cells; i++) {
            var offsetY = 0;
            this.board[i] = new Array(this.cells);
            for (var j = 0; j < this.cells; j++) {
                this.board[i][j] = new BoardCell(offsetX, offsetY, this.cellSize - this.lineWidth, i, j);
                offsetY += this.cellSize + this.lineWidth;
            }
            offsetX += this.cellSize + this.lineWidth;
        }

        this.$board.click(function (event) {
            var boardCell = self.findBoardCell(event.pageX - self.$board.position().left, event.pageY - self.$board.position().top);
            self.move(boardCell);
        });

        this.$board.mousemove(function (event) {
            if (self.highlightedCell && self.highlightedCell.isEmpty())
                self.highlightedCell.clear();

            var boardCell = self.findBoardCell(event.pageX - self.$board.position().left, event.pageY - self.$board.position().top);
            if (boardCell && boardCell.isEmpty()) {
                boardCell.highlight();
                self.highlightedCell = boardCell;
            }
        });

        this.$board.mouseleave(function () {
            if (self.highlightedCell && self.highlightedCell.isEmpty())
                self.highlightedCell.clear();
        });
    };

    this.drawBoard = function () {
        this.ctx.strokeStyle = this.lineColor;
        this.ctx.lineWidth = this.lineWidth;

        var offset = this.cellSize;
        for (var i = 0; i < this.cells - 1; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(offset, 0);
            this.ctx.lineTo(offset, boardSize);
            this.ctx.closePath();
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, offset);
            this.ctx.lineTo(boardSize, offset);
            this.ctx.closePath();
            this.ctx.stroke();

            offset += this.cellSize + this.lineWidth;
        }
    };

    this.findBoardCell = function (x, y) {
        var offsetIncrement = this.cellSize + this.lineWidth;
        for (var i = 0; i < this.cells; i++) {
            for (var j = 0; j < this.cells; j++) {
                var boardCell = this.board[i][j];
                if (x >= boardCell.left && y >= boardCell.top
                    && x <= boardCell.left + offsetIncrement && y <= boardCell.top + offsetIncrement)
                    return boardCell;
            }
        }
        return null;
    };

    this.move = function (boardCell) {
        if (!boardCell.isEmpty() || boardCell.isRestricted || this.gameOver)
            return;

        boardCell.draw(this.isBlackMove());
        this.moves.push(boardCell);

        this.toggleRestrictedBoardCells();

        this.gameOver = this.checkWin();
        if (this.settings.saveState)
            this.saveState();
    };

    this.analyse = function (forward) {
        if (!this.gameOver)
            return;

        var i;
        if (forward) {
            for (i = 0; i < this.moves.length; i++)
                if (this.moves[i].isEmpty()) {
                    this.moves[i].draw(i % 2 == 0);
                    return;
                }
        }
        else {
            for (i = this.moves.length - 1; i > -1; i--)
                if (!this.moves[i].isEmpty()) {
                    this.moves[i].clear();
                    return;
                }
        }
    };

    this.show = function () {
        $(this.moves).each(function (index, boardCell) {
            boardCell.draw(index % 2 == 0);
        });
    };

    this.clearBoard = function () {
        $(this.moves).each(function (index, boardCell) {
            boardCell.clear();
        });
    };

    this.toggleRestrictedBoardCells = function () {
        if (!this.settings.professionalRules || this.moves.length != 2 && this.moves.length != 3)
            return;

        var firstBlackBoardCell = this.moves[0];
        if (!firstBlackBoardCell)
            return;

        for (var i = firstBlackBoardCell.indexX - 2; i <= firstBlackBoardCell.indexX + 2; i++)
            for (var j = firstBlackBoardCell.indexY - 2; j <= firstBlackBoardCell.indexY + 2; j++) {
                var boardCell = this.board[i][j];
                if (boardCell)
                    boardCell.isRestricted = !boardCell.isRestricted;
            }
    };

    this.newGame = function () {
        this.clearBoard();
        this.moves = new Array();
        this.gameOver = false;

        if (this.settings.professionalRules)
            this.move(this.board[7][7]);

        this.saveState();
    };

    this.isBlackMove = function () { return this.moves.length % 2 == 0; };

    this.checkWin = function () {
        var result = false;

        var lastBoardCell = this.moves[this.moves.length - 1];
        if (lastBoardCell) {
            var winCells = new Array();
            //check horizontally
            for (var i = lastBoardCell.indexX - 5; i < lastBoardCell.indexX + 5; i++) {
                if (this.board[i] && this.board[i][lastBoardCell.indexY].isBlack == lastBoardCell.isBlack) {
                    winCells.push(this.board[i][lastBoardCell.indexY]);
                    if (winCells.length == 5) {
                        result = true;
                        break;
                    }
                } else {
                    winCells = new Array();
                }
            }

            if (!result) {
                //check vertically
                winCells = new Array();
                for (var j = lastBoardCell.indexY - 5; j < lastBoardCell.indexY + 5; j++) {
                    if (this.board[j] && this.board[lastBoardCell.indexX][j].isBlack == lastBoardCell.isBlack) {
                        winCells.push(this.board[lastBoardCell.indexX][j]);
                        if (winCells.length == 5) {
                            result = true;
                            break;
                        }
                    } else {
                        winCells = new Array();
                    }
                }
            }

            if (!result) {
                //check diagonally left-top - right-bottom
                winCells = new Array();
                for (i = lastBoardCell.indexX - 5, j = lastBoardCell.indexY - 5; i < lastBoardCell.indexX + 5; i++, j++) {
                    if (this.board[i] && this.board[i][j] && this.board[i][j].isBlack == lastBoardCell.isBlack) {
                        winCells.push(this.board[i][j]);
                        if (winCells.length == 5) {
                            result = true;
                            break;
                        }

                    } else {
                        winCells = new Array();
                    }
                }
            }

            if (!result) {
                //check diagonally left-bottom - right-top
                winCells = new Array();
                for (i = lastBoardCell.indexX - 5, j = lastBoardCell.indexY + 5; i < lastBoardCell.indexX + 5; i++, j--) {
                    if (this.board[i] && this.board[i][j] && this.board[i][j].isBlack == lastBoardCell.isBlack) {
                        winCells.push(this.board[i][j]);
                        if (winCells.length == 5) {
                            result = true;
                            break;
                        }
                    } else {
                        winCells = new Array();
                    }
                }
            }

            if (result) {
                $(winCells).each(function (index, boardCell) {
                    boardCell.toggleFigureHighlight();
                });
            }
        }
        return result;
    };

    this.undo = function () {
        if (this.gameOver)
            return;

        var lastBoardCell = this.moves.pop();
        if (lastBoardCell) {
            lastBoardCell.clear();
        }
    };

    this.restoreState = function() {
        if (this.storedMoves) {
            this.clearBoard();
            this.moves = new Array();
            
            $(this.storedMoves).each(function (index, move) {
                if (self.board[move.x] && self.board[move.x][move.y]) {
                    var boardCell = self.board[move.x][move.y];
                    boardCell.draw(self.isBlackMove());
                    self.moves.push(boardCell);
                    self.toggleRestrictedBoardCells();
                }
            });
            this.gameOver = this.checkWin();
        }
        this.saveState();
    };
    
    this.refresh = function () {
        this.clearBoard();
        this.show();
    };

    this.showFullScreen = function () {
        var domBoard = this.$board[0];

        //works only in chrome
        if (domBoard.webkitRequestFullscreen) {
            domBoard.webkitRequestFullscreen();
        }

        //        if (domBoard.requestFullscreen) {
        //            domBoard.requestFullscreen();
        //        } else if (domBoard.mozRequestFullScreen) {
        //            domBoard.mozRequestFullScreen();
        //        } else if (domBoard.webkitRequestFullscreen) {
        //            domBoard.webkitRequestFullscreen();
    };

    this.log = function (text) {
        $('#log').text(text);
    };

    this.init();

    this.newGame();

    this.restoreState();
};
