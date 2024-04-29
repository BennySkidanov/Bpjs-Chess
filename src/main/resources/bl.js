function mySync(stmt, syncData) {
    if (generationMode) {
        bp.log.info("In mySync, stmt = " + stmt + ", syncData = " + syncData)
        if (stmt.request) {
            if (!stmt.waitFor) {
                stmt.waitFor = []
            } else if (!Array.isArray(stmt.waitFor)) {
                stmt.waitFor = [stmt.waitFor]
            }
            if (!Array.isArray(stmt.request)) {
                stmt.request = [stmt.request]
            }
            stmt.waitFor = stmt.waitFor.concat(stmt.request)
            stmt.request = []
        }
    }
    if (syncData)
        return sync(stmt, syncData);
    return sync(stmt)
}

function getNextChar(char) {
    return String.fromCharCode(char.charCodeAt(0) + 1);
}

function getPrevChar(char) {
    return String.fromCharCode(char.charCodeAt(0) - 1);
}

const ANSI_RESET = "\u001B[0m";
const ANSI_PURPLE = "\u001B[35m";
const ANSI_CYAN = "\u001B[36m";
const TAKES = 'x';
const QUEENING = '=';
const KING_INFINITE_VALUE = 100;

const allMovesList = (function () {
    let moves = pgn.split(" ");

    bp.log.info("moves after splitting => " + moves)

    let allMovesList = [];

    for (let i = 0; i < moves.length; i++) {
        if (i % 3 !== 0) { // index is even
            allMovesList.push(moves[i]);
        }
    }


    return allMovesList
    /*
        let whiteMoves = [];
        let blackMoves = [];
        for (let i = 0; i < allMovesList.length; i+=2) {
            whiteMoves.push(allMovesList[i]);
            blackMoves.push(allMovesList[i+1]);
        }

        bp.log.info(whiteMoves);
        bp.log.info(blackMoves);*/
})()
const AnyCastling = bp.EventSet("AnyCastling", function (e) {
    return false
})
const anyMoves = bp.EventSet("anyMove", function (e) {
    return e.name.startsWith("Move")
})
const ESCenterCaptureMoves = bp.EventSet("EScenterCaptureMoves", function (e) {
    return e.name == 'Move' && e.data.color == "White" && (e.data.dst[1] == '3' || e.data.dst[1] == '4')
        && (e.data.src[0] == 'c' || e.data.src[0] == 'd' || e.data.src[0] == 'e' || e.data.src[0] == 'f' ||
            e.data.src[0] == 'b' || e.data.src[0] == 'g')
        && (e.data.dst[0] == 'c' || e.data.dst[0] == 'd' || e.data.dst[0] == 'e' || e.data.dst[0] == 'f')

})
// Todo: fix source checking and destination rows ( 3 & 4 -> 4 & 5)

const ESPawnDevelopingMoves = bp.EventSet("ESpawnDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece === "Pawn" &&
        (e.data.dst[1] == '3' || e.data.dst[1] == '4' || e.data.dst[1] == '5')
})

const ESKnightDevelopingMoves = bp.EventSet("ESKnightDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece === "Knight" &&
        (e.data.dst[1] == '2' || e.data.dst[1] == '3' || e.data.dst[1] == '4')
})

const ESBishopDevelopingMoves = bp.EventSet("ESBishopDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece == "Bishop" &&
        (e.data.dst[1] == '2' || e.data.dst[1] == '3' || e.data.dst[1] == '4'
            || e.data.dst[1] == '5')
})

const ESQueenDevelopingMoves = bp.EventSet("ESQueenDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece === "Queen" &&
        (e.data.dst[1] == '2' || e.data.dst[1] == '3' || e.data.dst[1] == '4'
            || e.data.dst[1] == '5')
})

const ESRookDevelopingMoves = bp.EventSet("ESRookDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece === "Rook" &&
        (e.data.dst[1] == '2' || e.data.dst[1] == '3' || e.data.dst[1] == '4')
})

const ESFianchettoMoves = bp.EventSet("ESfianchettoMoves", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece === "Pawn" &&
        (e.data.dst[1] == '3' || e.data.dst[1] == '4') &&
        (e.data.dst[0] == 'b' || e.data.dst[0] == 'g')
})

const ESScholarsMateMoves1 = bp.EventSet("ESscholarsMateMoves1", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece === "Pawn" &&
        (e.data.dst[0] == 'e' && (e.data.dst[1] == '4' || e.data.dst[1] == '3'))
})

const ESScholarsMateMoves2 = bp.EventSet("ESscholarsMateMoves2", function (e) {
    return e.name == 'Move' && e.data.color == "White" &&
        ((e.data.piece === "Queen" &&
                (
                    (e.data.dst[0] == 'h' && e.data.dst[1] == '5') ||
                    (e.data.dst[0] == 'f' && e.data.dst[1] == '3') ||
                    (e.data.dst[0] == 'f' && e.data.dst[1] == '4') ||
                    (e.data.dst[0] == 'f' && e.data.dst[1] == '5') ||
                    (e.data.dst[0] == 'f' && e.data.dst[1] == '6') ||
                    (e.data.dst[0] == 'e' && e.data.dst[1] == '6') ||
                    (e.data.dst[0] == 'd' && e.data.dst[1] == '5') ||
                    (e.data.dst[0] == 'c' && e.data.dst[1] == '4') ||
                    (e.data.dst[0] == 'b' && e.data.dst[1] == '3')
                )
            ) ||
            (e.data.piece === "Bishop" &&
                (
                    (e.data.dst[0] == 'a' && e.data.dst[1] == '2') ||
                    (e.data.dst[0] == 'c' && e.data.dst[1] == '4') ||
                    (e.data.dst[0] == 'b' && e.data.dst[1] == '3')
                )
            ))
})

const ESDeceivingScholarsMateMoves2 = bp.EventSet("ESDeceivingScholarsMateMoves2", function (e) {
    return e.name == 'Move' && e.data.color == "White" &&
        ((e.data.piece === "Queen" && e.data.dst[0] == 'h' && e.data.dst[1] == '5'))
})


const ESScholarsMateMoves3 = bp.EventSet("ESscholarsMateMoves3", function (e) {
    return e.name == 'Move' && e.data.color == "White" &&
        ((e.data.piece === "Queen" && e.data.dst[0] == 'f' && e.data.dst[1] == '7'))
})

const ESFriedLiverAttackMoves = bp.EventSet("ESfriedLiverAttackMoves", function (e) {
    return e.name == 'Move' && e.data.color == "White" &&
        (e.data.piece === "Pawn" && (e.data.dst[0] == 'e' && (e.data.dst[1] == '4' || e.data.dst[1] == '3'))) ||
        (e.data.piece == "Knight" &&
            (((
                    (e.data.dst[0] == 'f' && e.data.dst[1] == '3') ||
                    (e.data.dst[0] == 'g' && e.data.dst[1] == '5') ||
                    (e.data.dst[0] == 'f' && e.data.dst[1] == '7'))
                ) ||
                (e.data.piece === "Bishop" && (e.data.dst[1] == '4' || e.data.dst[1] == '5'))))
})

const ESChasingAndPreventingAttacksOnBG4 = bp.EventSet("ESBG4AttacksDefending", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece === "Pawn" &&
        (e.data.dst[0] == 'a' && e.data.dst[1] == '3') ||
        (e.data.dst[0] == 'h' && e.data.dst[1] == '3') ||
        (e.data.dst[0] == 'b' && e.data.dst[1] == '4') ||
        (e.data.dst[0] == 'g' && e.data.dst[1] == '4')
})

const ESControlSpaceMoves = bp.EventSet("ESControlSpace", function (e) {
    return e.name == 'Move' && e.data.color == "White" && e.data.piece === "Pawn" &&
        (e.data.dst[1] == '3' || e.data.dst[1] == '4')
})

function startsWithCapital(word) {
    return word.charAt(0) === word.charAt(0).toUpperCase()
}


// Helper function : Find if there any pieces in between srcCell And dstCell to prevent "jumping" above pieces
function noPiecesInBetweenStraight(srcCell, dstCell) {
    // bp.log.info("noPiecesInBetween : " + srcCell + " => " + dstCell)
    let nonOccupiedCellsSet = ctx.runQuery("Cell.all.nonOccupied")
    // bp.log.info(nonOccupiedCellsSet)
    let nonOccupiedCellsIds = []
    for (let cellIndex = 0; cellIndex < nonOccupiedCellsSet.length; cellIndex++) {
        //bp.log.info(nonOccupiedCellsSet[cellIndex].id)
        nonOccupiedCellsIds.push(nonOccupiedCellsSet[cellIndex].id)
    }
    if (srcCell[0].charCodeAt(0) === dstCell[0].charCodeAt(0)) // Same Column
    {
        // bp.log.info("Same Column")
        // Run through rows indexes
        if (srcCell[1] > dstCell[1]) {
            // bp.log.info("Same Column (option 1)")
            for (let rowIndex = String.fromCharCode(dstCell[1].charCodeAt(0) + 1); rowIndex < srcCell[1]; rowIndex = getNextChar(rowIndex)) {
                // bp.log.info("noPiecesInBetween : Inspecting " + (srcCell[0] + rowIndex))
                if (!(nonOccupiedCellsIds.includes(srcCell[0] + rowIndex)))
                    return false;
            }
        } else {
            // bp.log.info("Same Column (option 2)")
            for (let rowIndex = String.fromCharCode(srcCell[1].charCodeAt(0) + 1); rowIndex < dstCell[1]; rowIndex = getNextChar(rowIndex)) {
                // bp.log.info("noPiecesInBetween : Inspecting " + (srcCell[0] + rowIndex))
                if (!(nonOccupiedCellsIds.includes(srcCell[0] + rowIndex)))
                    return false;
            }
        }
    } else if (srcCell[1] === dstCell[1]) // Same Row
    {
        // bp.log.info("Same Row")
        // Run through rows indexes
        if (srcCell[0] > dstCell[0]) {
            // bp.log.info("Same Row (option 1)")

            for (let colIndex = String.fromCharCode(dstCell[0].charCodeAt(0) + 1); colIndex < srcCell[0]; colIndex = getNextChar(colIndex)) {
                // bp.log.info("noPiecesInBetween : Inspecting " + colIndex + srcCell[1])
                if (!(nonOccupiedCellsIds.includes(colIndex + srcCell[1]))) {
                    // bp.log.info("noPiecesInBetween, Returning False");
                    return false;
                }
            }
        } else {
            // bp.log.info("Same Row (option 2)")
            // bp.log.info("noPiecesInBetween : need to inspect every column between " + String.fromCharCode(srcCell[0].charCodeAt(0) + 1) + " -> " + dstCell[0])
            // let checkvar = (String.fromCharCode(srcCell[0].charCodeAt(0) + 1))
            // checkvar = getNextChar(checkvar)
            // bp.log.info("noPiecesInBetween : Check -> " + checkvar)
            for (let colIndex = String.fromCharCode(srcCell[0].charCodeAt(0) + 1); colIndex < dstCell[0]; colIndex = getNextChar(colIndex)) {
                // bp.log.info("noPiecesInBetween : Inspecting " + colIndex + srcCell[1])
                if (!(nonOccupiedCellsIds.includes(colIndex + srcCell[1]))) {
                    // bp.log.info("noPiecesInBetween, Returning False");
                    return false;
                } else {
                    // bp.log.info("Continue...")
                    continue;
                }
            }
        }
    } else {
        return false
    }
    bp.log.info("noPiecesInBetween, Returning True");
    return true;

}

function noPiecesInBetweenDiagonal(piece, dstCell) {
    bp.log.info("noPiecesInBetweenDiagonal => " + piece.cellId)
    let allCells = ctx.runQuery("Cell.all");
    let reachableCells = availableDiagonalCellsFromPiece(piece, 8, allCells)[1];

    for (let i = 0; i < reachableCells.length; i++) {
        // bp.log.info("noPiecesInBetweenDiagonal")
        bp.log.info(reachableCells[i].id)

        if (reachableCells[i].id === dstCell ||
            Math.abs(dstCell[1] - reachableCells[i].id[1]) === Math.abs(dstCell[0].charCodeAt(0) - reachableCells[i].id [0].charCodeAt(0)))
            return true;
    }

    return false;
}

function canReachSquareTrading(piece, dstCell, takes, enPassant) {
    bp.log.info("In canReachSquare Trading, dstCell = " + dstCell)
    bp.log.info("enPassant = " + enPassant + ", takes = " + takes)
    bp.log.info(piece.subtype)
    bp.log.info(piece.cellId)
    bp.log.info(dstCell)
    let colToTakePawn = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let rowToTakePawn = (dstCell[1] - '0');
    let allCells = ctx.runQuery("Cell.all")
    // bp.log.info(allCells)
    if (piece.subtype == "Pawn") {
        if (dstCell[0] == piece.cellId[0] &&
            (Math.abs(dstCell[1] - piece.cellId[1]) == 2 || Math.abs(dstCell[1] - piece.cellId[1]) == 1)
            && !takes) {
            // bp.log.info("Found!! ( pawn Advances )")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId != undefined && takes) {
            // bp.log.info("Found!! ( pawn Takes ) ")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId == undefined && enPassant) {

            // bp.log.info("Found!! ( pawn Takes En passant ) ")
            return true;
        }
        // return true;*/
        return false;
    } else if (piece.subtype == "Knight") {
        if (
            (Math.abs(dstCell[1] - piece.cellId[1]) === 2 && Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 1) ||
            (Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 2 && Math.abs(dstCell[1] - piece.cellId[1]) === 1)
        ) {
            // bp.log.info("Found!!")
            return true;
        }
        return false;
    } else if (piece.subtype == "Queen") {
        if (
            Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) ||
            ((dstCell[1] - piece.cellId[1]) === 0 || (dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 0)
            &&
            (noPiecesInBetweenDiagonal(piece, dstCell) || noPiecesInBetweenStraight(piece.cellId, dstCell))
        ) {
            // bp.log.info("Found!!")
            return true;
        }
        return false;
    } else if (piece.subtype == "Bishop") {
        if (
            Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0))
            &&
            noPiecesInBetweenDiagonal(piece, dstCell)
        ) {
            // bp.log.info("Found!!")
            return true;
        }
    } else if (piece.subtype == "King") {
        if (Math.abs(dstCell[1] - piece.cellId[1]) <= 1 &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) <= 1)
            return true;
    } else if (piece.subtype == "Rook") {
        if (
            ((dstCell[1] - piece.cellId[1]) === 0 || (dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 0)
            &&
            noPiecesInBetweenStraight(piece.cellId, dstCell)
        ) {
            // bp.log.info("Found Rook Move!!")
            return true;
        }
    }

    return false;

}


function canReachSquare(piece, dstCell, takes, enPassant) {
    // bp.log.info("In canReachSquare, dstCell = " + dstCell)
    // bp.log.info("enPassant = " + enPassant + ", takes = " + takes)
    // bp.log.info(piece.subtype)
    // bp.log.info(piece.cellId)
    // bp.log.info(dstCell)
    let colToTakePawn = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let rowToTakePawn = (dstCell[1] - '0');
    let allCells = ctx.runQuery("Cell.all")
    // bp.log.info(allCells)
    if (piece.subtype == "Pawn") {
        if (dstCell[0] == piece.cellId[0] &&
            (Math.abs(dstCell[1] - piece.cellId[1]) == 2 || Math.abs(dstCell[1] - piece.cellId[1]) == 1)
            && !takes) {
            // bp.log.info("Found!! ( pawn Advances )")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId != undefined && takes) {
            // bp.log.info("Found!! ( pawn Takes ) ")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId == undefined && enPassant) {

            // bp.log.info("Found!! ( pawn Takes En passant ) ")
            return true;
        }
        // return true;*/
        return false;
    } else if (piece.subtype == "Knight") {
        if (
            (Math.abs(dstCell[1] - piece.cellId[1]) === 2 && Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 1) ||
            (Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 2 && Math.abs(dstCell[1] - piece.cellId[1]) === 1)
        ) {
            // bp.log.info("Found!!")
            return true;
        }
        return false;
    } else if (piece.subtype == "Queen") {
        if (
            Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) ||
            ((dstCell[1] - piece.cellId[1]) === 0 || (dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 0)
        ) {
            // bp.log.info("Found!!")
            return true;
        }
        return false;
    } else if (piece.subtype == "Bishop") {
        if (
            Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0))
        ) {
            // bp.log.info("Found!!")
            return true;
        }
    } else if (piece.subtype == "King") {
        if (Math.abs(dstCell[1] - piece.cellId[1]) <= 1 &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) <= 1)
            return true;
    } else if (piece.subtype == "Rook") {
        if (
            ((dstCell[1] - piece.cellId[1]) === 0 || (dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 0)
            &&
            noPiecesInBetweenStraight(piece.cellId, dstCell)
        ) {
            // bp.log.info("Found Rook Move!!")
            return true;
        }
    }

    return false;

}

function handleShortCastle(color, pieces) {
    // bp.log.info("~~ handleShortCastle ~~ " + color)
    //let piecesValues = Array.from(pieces);
    if (color == "White") {
        let king, rook;
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                // bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "h1") {
                rook = pieces[i];
                // bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "g1", color);
        // bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "f1", color);
        // bp.log.info(eventKing);
        sync({request: eventRook}, 100);
        // transaction
    } else {
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                // bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "h8") {
                rook = pieces[i];
                // bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "g8", "Black");
        // bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "f8", "Black");
        // bp.log.info(eventKing);
        sync({request: eventRook}, 100);
    }
}

function handleLongCastle(color, pieces) {
    // bp.log.info("~~ handleLongCastle ~~ " + color)

    if (color == "White") {
        let king, rook;
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                // bp.log.info("~~ handleLongCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "a1") {
                rook = pieces[i];
                // bp.log.info("~~ handleLongCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "c1", color);
        // bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "d1", color);
        // bp.log.info(eventKing);
        sync({request: eventRook}, 100);
        // transaction
    } else {
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                // bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "a8") {
                rook = pieces[i];
                // bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "c8", "Black");
        // bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "d8", "Black");
        // bp.log.info(eventKing);
        sync({request: eventRook}, 100);
    }
}

function findPieceThatCanReachToEndSquare(piecePrefix, dstCell, color, takes, enPassant, enPassantPieceCellId) {
    // bp.log.info("In findPieceThatCanReachToEndSquare (En passant - " + enPassant + ", enPassantPieceCellId - " + enPassantPieceCellId + ")")
    // bp.log.info(piecePrefix)
    // bp.log.info(dstCell)
    // bp.log.info(color)
    let optionalCol = "";
    if (dstCell.length === 3) // Optional column appears
    {
        optionalCol = dstCell.charAt(0);
        dstCell = dstCell.substr(1);
        // bp.log.info("optionalCol " + optionalCol)
        // bp.log.info("dst cell " + dstCell)
    }
    let pieceType = prefixDictBL[piecePrefix];
    // bp.log.info('piece type={0}', pieceType)
    let allPiecesOfType = ctx.runQuery(getSpecificType(pieceType, color))


    let allPieces = ctx.runQuery("Piece.White.All")
    // bp.log.info(allPieces)

    let checkPieces = ctx.runQuery("Piece.Black.All")
    // bp.log.info(checkPieces)

    // bp.log.info('{0} pieces fit the description of the move', allPiecesOfType.length)
    // let allPiecesOfType = ctx.runQuery("Piece.White." + pieceType)
    //let allPiecesOfTypeValues = Array.from(allPiecesOfType);
    // bp.log.info(allPiecesOfType)
    for (let i = 0; i < allPiecesOfType.length; i++) {
        if (optionalCol == '') {
            // Todo : change here, not all calls with enPassant = True
            if (enPassant && allPiecesOfType[i].cellId === enPassantPieceCellId) {
                if (canReachSquare(allPiecesOfType[i], dstCell, takes, enPassant)) {
                    // bp.log.info(allPiecesOfTypeValues[i]);
                    return allPiecesOfType[i];
                }
            } else if (canReachSquare(allPiecesOfType[i], dstCell, takes, false)) {
                // bp.log.info(allPiecesOfTypeValues[i]);
                return allPiecesOfType[i];
            }
        } else {
            // bp.log.info("Checking piece that fits optional col!!" + optionalCol + " " + allPiecesOfType[i].cellId.charAt(0));
            if (allPiecesOfType[i].cellId.charAt(0) == optionalCol) {
                if (canReachSquare(allPiecesOfType[i], dstCell)) {
                    // bp.log.info(allPiecesOfTypeValues[i]);
                    // bp.log.info("IN Checking piece that fits optional col!!");
                    return allPiecesOfType[i];
                }
            }
        }
    }
}

function TradingGameTacticCheck(move, player) {
    let freePiece = 0
    let equalTrade = 0
    let worthwhileTrade = 0
    let worthlessTrade = 0
    if (player === 'White') {
        const piecesValues = {"Pawn": 1, "Bishop": 3, "Knight": 3, "Rook": 5, "Queen": 9, "King": KING_INFINITE_VALUE}
        const piecesPrefixes = {
            "a": "Pawn",
            "b": "Pawn",
            "c": "Pawn",
            "d": "Pawn",
            "e": "Pawn",
            "f": "Pawn",
            "g": "Pawn",
            "h": "Pawn",
            "B": "Bishop",
            "N": "Knight",
            "R": "Rook",
            "Q": "Queen",
            "K": "King"
        }
        let takingDstCell = move.data.dst;
        bp.log.info("Trading on " + takingDstCell)
        let opponentPieces = ctx.runQuery("Piece.Black.All")
        let playerPieces = ctx.runQuery("Piece.White.All")
        let takenPieceValue = piecesValues[bp.store.get("NON-FEATURE: TAKEN PIECE")];
        // let takingPieceValue = piecesValues[piecesPrefixes[move[0]]]
        let takingPieceValue = 1

        for (let i = 0; i < opponentPieces.length; i++) {
            if (opponentPieces[i].cellId === takingDstCell) {
                takenPieceValue = piecesValues[opponentPieces[i].subtype]
                break;
            }
        }


        let opponentTotalValue = 0;
        let numberOfOpponentPiecesDefending = 0;
        for (let i = 0; i < opponentPieces.length; i++) {
            let value = piecesValues[opponentPieces[i].subtype]

            if (canReachSquareTrading(opponentPieces[i], takingDstCell, true, false)) {
                opponentTotalValue += value
                numberOfOpponentPiecesDefending++;
            }
        }

        let playerTotalValue = 0;
        let numberOfPlayerPiecesDefending = 0;
        for (let i = 0; i < playerPieces.length; i++) {
            let value = piecesValues[playerPieces[i].subtype]

            if (canReachSquareTrading(playerPieces[i], takingDstCell, true, false)) {
                playerTotalValue += value
                numberOfPlayerPiecesDefending++;
            }
        }
        // playerTotalValue--;
        // numberOfPlayerPiecesDefending--;

        bp.log.info("TradingGameTacticCheck ( Taken Piece Value => " + takenPieceValue + " )")
        bp.log.info(opponentPieces)
        bp.log.info(playerTotalValue + " ( " + numberOfPlayerPiecesDefending + " pieces ) vs. "
            + opponentTotalValue + " ( " + numberOfOpponentPiecesDefending + " pieces )")


        if (opponentTotalValue === 0 || (opponentTotalValue === KING_INFINITE_VALUE && playerTotalValue > 0)) {
            bp.log.info("Free Piece -> Excellent Trade");
            return [1, 0, 0, 0];
        } else if (takenPieceValue === takingPieceValue) {
            bp.log.info("Equal Value -> Fair Trade");
            return [0, 1, 0, 0];
        } else if ((numberOfPlayerPiecesDefending === numberOfOpponentPiecesDefending && playerTotalValue < opponentTotalValue) ||
            (numberOfPlayerPiecesDefending > numberOfOpponentPiecesDefending ||
                takingPieceValue < takenPieceValue)) {
            bp.log.info("You can defend this Piece or You've Earned Material -> Good Trade");
            return [0, 0, 1, 0];
        } else {
            bp.log.info("You should've not capture -> Worthless Trade");
            return [0, 0, 0, 1];
        }


    }


    return [freePiece, equalTrade, worthwhileTrade, worthlessTrade];
}

ctx.bthread("ParsePGNAndSimulateGame", "Phase.Opening", function (entity) {

    let player = '';
    let checkmate = false;
    let enPassant = false;
    bp.log.info("allMovesList => " + allMovesList)
    for (let i = 0; i < allMovesList.length; i++) {

        // Reset General Tactics features
        // bp.store.put("General Tactics: Check", 0)
        // bp.store.put("General Tactics: Checkmate", 0)
        // bp.store.put("General Tactics: Take Free Piece", 0)
        // bp.store.put("General Tactics: Equal Trade", 0)
        // bp.store.put("General Tactics: Worthwhile Trade", 0)
        // bp.store.put("General Tactics: Worthless Trade", 0)


        enPassant = false;
        (i % 2 === 0) ? player = 'White' : player = 'Black';
        let move = allMovesList[i]
        let pieces = ctx.runQuery("Piece." + player + ".All");
        bp.log.info("~~ LOG ~~ Next PGN Move = {0}", move)

        // Game Tactics + Flags Update

        if (move.charAt(move.length - 1) == '+' || move.charAt(move.length - 1) == '#') { // Special Handling: Check & Checkmate
            bp.log.info("~~ LOG ~~ Special Handling")
            if (move.charAt(move.length - 1) == '#') {
                bp.log.info("~~ LOG ~~ Checkmate")
                checkmate = true;
                //bp.store.put("General Tactics: Checkmate", 1)
            } else if (move.charAt(move.length - 1) == '+') {
                bp.log.info("~~ LOG ~~ Check")
                // bp.store.put("General Tactics: Check", 1)
            }
            move = move.substr(0, move.length - 1)
        }

        // if (move.indexOf(TAKES) > -1 && i % 2 === 0) {
        //     bp.log.info("UPDATING GENERAL TACTICS")
        //     let returnValuesList = TradingGameTacticCheck(move, player)
        //     bp.store.put("General Tactics: Take Free Piece", returnValuesList[0])
        //     bp.store.put("General Tactics: Equal Trade", returnValuesList[1])
        //     bp.store.put("General Tactics: Worthwhile Trade", returnValuesList[2])
        //     bp.store.put("General Tactics: Worthless Trade", returnValuesList[3])
        // }


        // bp.log.info("Next PGN Move (Again) = {0}", move)
        if (move.indexOf(TAKES) > -1 && (move.indexOf(QUEENING) > -1)) {
            // bp.log.info("~~ LOG ~~ Takes & Queen event!!")
            let piece = findPieceThatCanReachToEndSquare(startsWithCapital(move) ? move[0] : "P",
                move.substr(move.indexOf(TAKES) + 1, 2),
                player, true, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr(move.indexOf(TAKES) + 1, 2), piece.color, true);
            // bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                // bp.log.info("Checkmate")
                // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        } else if (move.indexOf(TAKES) > -1) {
            // bp.log.info("Takes event!!")
            if (
                allMovesList[i][(allMovesList[i].indexOf('x')) + 1] === allMovesList[i - 1][0] &&
                (allMovesList[i - 1].charAt(1) === '4' || allMovesList[i - 1].charAt(1) === '5') &&
                !(allMovesList.includes(allMovesList[i - 1][0] + '3'))
            ) {
                // bp.log.info("En passant!!")
                enPassant = true;
            }
            let piece = findPieceThatCanReachToEndSquare(
                startsWithCapital(move) ? move[0] : "P",
                move.substr((move.indexOf('x') + 1)),
                player, true, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr((move.indexOf('x') + 1)), piece.color, true);
            // bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                // bp.log.info("Checkmate")
                // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        } else if (move == "O-O" || move == "O-O-O") {
            bp.log.info("Castling event!!")
            if (move == "O-O") handleShortCastle(player, pieces);
            else if (move == "O-O-O") handleLongCastle(player, pieces);
        } else if ((move.indexOf('=') > -1)) {
            // bp.log.info("Queening event");
            let piece = findPieceThatCanReachToEndSquare(
                startsWithCapital(move) ? move[0] : "P",
                move.substr(0, 2),
                player, false, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr(0, 2), piece.color);
            // bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                // bp.log.info("Checkmate")
                // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        } else {
            bp.log.info("~~ LOG (773) ~~ " + move)
            let piece = findPieceThatCanReachToEndSquare(
                startsWithCapital(move) ? move[0] : "P",
                startsWithCapital(move) ? move.substr(1) : move,
                player, false, false);
            // bp.log.info("REACHED SYNC")
            // bp.log.info("piece is {0}", piece)
            let event = moveEvent(piece.subtype, piece.cellId,
                startsWithCapital(move) ? move.length === 3 ? move.substr(1) : move.substr(2) : move, piece.color);
            // bp.log.info("The Move -- " + event);
            if (!checkmate) {
                // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                // bp.log.info("Checkmate")
                // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        }
    }
    bp.log.info("~~ LOG (788) ~~ Finished Parsing Game!!")
    sync({block: anyMoves}, 100);
})

/*
    1. PGN basics :
       1.a. Moves :
               Pawn -> e4
               Knight -> Nf6
               Bishop -> Be3
               Rook -> Rh3
               Queen -> Qd2
               King -> Kc2
       1.b. Taking :
               Pawn -> exd5
               Knight -> Nxd5
               Bishop -> Bxf4
               Rook -> Rxd2
               Queen -> Qxe3
               King -> Kxg1
       1.c. Special Exceptions :
               Short castle -> O-O
               Long castle -> O-O-O
               Check ( moving or taking ) -> Qxd3+ , e4+
               Mate ( moving or taking ) -> Qxd3# , e4#
               Two pieces of the same color can move to the same cell ( or take on this cell ) -> R1d1 , fxe5

    2. Center squares - c4, d4, e4, f4, c5, d5, e5, f5

    3. Reasons for moves to be blocked:
        a. The move exposes the king ( causes a check )
        b. The desired move of the king is blocked due an opponent's piece "eyeing" the dst. cell
        c. Opponent's piece is "in the way" ( note: Knight can't be blocked and can "jump" over pieces )

    4. Strategies in the opening:
        - Developing pieces
        - Strengthening the center squares
        - Fianchetto
    What is the probability of each of the strategies to be executed given a certain move \ situation ?

*/

// Game behavioral thread
bthread("Game thread", function (entity) {

    // Total - 25 features

    // General Tactics - Binary Features
    bp.store.put("General Tactics: Check", 0)
    bp.store.put("General Tactics: Checkmate", 0)
    bp.store.put("General Tactics: Take Free Piece", 0)
    bp.store.put("General Tactics: Equal Trade", 0)
    bp.store.put("General Tactics: Worthwhile Trade", 0)
    bp.store.put("General Tactics: Worthless Trade", 0)


    // Optional "Rainy Day" Feature, Not Used
    bp.store.put("Developing the queen too early", 0)

    bp.store.put("Strategy Counter: Center strengthen moves", 0)
    bp.store.put("Strategy Counter: Fianchetto moves", 0)
    bp.store.put("Strategy Counter: Developing moves", 0)

    bp.store.put("Game Plan Counter: Scholars Mate", 0)
    bp.store.put("Game Plan Counter: Deceiving Scholars Mate", 0)
    bp.store.put("Game Plan Counter: Fried Liver Attack", 0)
    bp.store.put("Game Plan Counter: Strengthen Pawn Structure", 0)
    bp.store.put("Game Plan Counter: Capturing Space", 0)

    bp.store.put("Moves Counter: Attacking", 0)
    bp.store.put("Moves Counter: Defending", 0)
    bp.store.put("Moves Counter: Preventing b4, g4 Attacks", 0)

    bp.store.put("Piece Moves Counter: Pawn moves", 0)
    bp.store.put("Piece Moves Counter: Bishop moves", 0)
    bp.store.put("Piece Moves Counter: Knight moves", 0)
    bp.store.put("Piece Moves Counter: Queen moves", 0)
    bp.store.put("Piece Moves Counter: Rook moves", 0)

    bp.store.put("Strategy Advisor: Center", 5)
    bp.store.put("Strategy Advisor: Develop", 3)
    bp.store.put("Strategy Advisor: Fianchetto", 1)

    bp.store.put("Piece Advisor: Pawn", 5)
    bp.store.put("Piece Advisor: Bishop", 3)
    bp.store.put("Piece Advisor: Knight", 3)
    bp.store.put("Piece Advisor: Queen", 1)
    bp.store.put("Piece Advisor: Rook", 1)

    while (true) {

        sync({request: bp.Event("Game Phase", "Opening")})
        bp.log.info("~~ LOG ~~ Context Changed - Opening Starts!!")
        sync({waitFor: AnyCastling})
        // sync({request: bp.Event("Game Phase", "Mid Game")})
        // sync({request: bp.Event("Game Phase", "End Game")})

        /*mySync([bp.Event("Game Phase" , "Opening")], [], []);
        mySync([], [AnyCastling], []);
        mySync([bp.Event("Game Phase" , "Mid Game")], [], []);
        mySync([bp.Event("Game Phase" , "End Game")], [], []);*/
    }
});

/* Strategies in the opening:
    1. Developing pieces
    2. Strengthening the center squares
    3. Fianchetto
    What is the probability of each of the strategies to be executed given a certain move \ situation ?
 */

function clearDuplicates(moves) {
    let arr = []
    new Set(moves).forEach(e => arr.push(e))
    return arr

    /*let pawnMovesToRequest = []
    let dup = false
    for (let i = 0; i < pawnMoves.length; i++) {
        dup = false
        for (let j = 0; j < pawnMovesToRequest.length; j++) {
            if (pawnMoves[i].data.src == pawnMovesToRequest[j].data.src &&
                pawnMoves[i].data.dst == pawnMovesToRequest[j].data.dst) {
                dup = true
                break;
            }
        }
        if (!dup)
            pawnMovesToRequest.push(pawnMoves[i])
    }
    return pawnMovesToRequest*/
}

function filterOccupiedCellsMoves(pawnMovesSet, cellsArr) {
    let retArr = []
    for (let i = 0; i < pawnMovesSet.length; i++) {
        let srcCellFound = false
        let dstCellFound = false
        for (let cell of cellsArr.values()) {
            if (pawnMovesSet[i].data.src == cell.id) {
                srcCellFound = true
            }
            if (pawnMovesSet[i].data.dst == cell.id) {
                dstCellFound = true
            }
        }
        if (srcCellFound == false && dstCellFound == true) {
            retArr.push(pawnMovesSet[i])
        }
    }
    return retArr
}

/*ctx.bthread("Strengthen", "Phase.Opening", function (entity) {

    while (true) {
        let pawnMoves = []
        let pawnsSet = ctx.runQuery(getSpecificType('Pawn', 'White'))
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        // let allCellsArr = Array.from(allCells);

        for (let i = 0; i < pawnsSet.length; i++) {
            let aval = availableStraightCellsFromPawn(pawnsSet[i], 2, allCells);
            let aval2 = [];
            for (let j = 0; j < aval.length; j++) {
                if (ESCenterCaptureMoves.contains(aval[j])) {
                    aval2.push(aval[j]);
                }
            }
            pawnMoves = pawnMoves.concat(aval2);
        }

        let pawnMovesSet = clearDuplicates(pawnMoves)
        let pawnMovesToRequest = filterOccupiedCellsMoves(pawnMovesSet, cellsSet)


        // ACHIYA: why request and waitFor are the same? redundant and makes no sense I think you meant to wait for anyMove...
        //("mySync : Requesting center moves")
        bp.log.info("Strengthen : {0}", pawnMovesToRequest)
        mySync({request: pawnMovesToRequest, waitFor: anyMoves})
        // mySync(pawnMovesToRequest, pawnMovesToRequest, []);

        // let receivedCounter = bp.store.get("Strategy Counter: Center strengthen moves")
        // bp.store.put("Strategy Counter: Center strengthen moves", receivedCounter + 1)
    }
});*/

/*ctx.bthread("Fianchetto", "Phase.Opening", function (entity) {

    while (true) {

        let pawnMoves = []
        let pawnsSet = ctx.runQuery(getSpecificType('Pawn', 'White'))
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        //let allCellsArr = Array.from(allCells);

        for (let i = 0; i < pawnsSet.length; i++) {
            let aval = availableStraightCellsFromPawn(pawnsSet[i], 2, allCells);
            let aval2 = [];
            for (let j = 0; j < aval.length; j++) {
                if (ESCenterCaptureMoves.contains(aval[j])) {
                    aval2.push(aval[j]);
                }
            }
            pawnMoves = pawnMoves.concat(aval2);
        }

        let pawnMovesSet = clearDuplicates(pawnMoves)
        let pawnMovesToRequest = filterOccupiedCellsMoves(pawnMovesSet, cellsSet)

        //bp.log.info("mySync : Requesting Fianchetto moves")
        // ACHIYA: why request and waitFor are the same? redundant and makes no sense I think you meant to wait for anyMove...
        bp.log.info("Fianchetto : {0}", pawnMovesToRequest == null ? pawnMovesToRequest : "null")
        mySync({request: pawnMovesToRequest, waitFor: anyMoves})
        // mySync(pawnMovesToRequest, pawnMovesToRequest, []);

        // let receivedCounter = bp.store.get("Strategy Counter: Fianchetto moves")
        // bp.store.put("Strategy Counter: Fianchetto moves", receivedCounter + 1)
    }
});*/

ctx.bthread("DevelopingPawns", "Phase.Opening", function (entity) {

    while (true) {

        let pawnMoves = []
        let pawnsSet = ctx.runQuery(getSpecificType('Pawn', 'White'))
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        //let allCellsArr = Array.from(allCells);

        for (let i = 0; i < pawnsSet.length; i++) {
            let aval = availableStraightCellsFromPawn(pawnsSet[i], 2, allCells);
            let aval2 = [];
            for (let j = 0; j < aval.length; j++) {
                if (ESCenterCaptureMoves.contains(aval[j])) {
                    aval2.push(aval[j]);
                }
            }
            pawnMoves = pawnMoves.concat(aval2);
        }

        let pawnMovesSet = clearDuplicates(pawnMoves)
        let pawnMovesToRequest = filterOccupiedCellsMoves(pawnMovesSet, cellsSet)

        //bp.log.info("the object is {0}", pawnMovesSet)

        pawnsSet = cellsSet = allCells = pawnMoves = pawnMovesSet = null;


        //("mySync : Requesting pawn developing moves")
        mySync({request: pawnMovesToRequest, waitFor: anyMoves})
        // mySync(pawnMovesToRequest, pawnMovesToRequest, []);

        // let receivedCounter = bp.store.get("Strategy Counter: Developing moves")
        // bp.store.put("Strategy Counter: Developing moves", receivedCounter + 1)
    }
});

ctx.bthread("DevelopingBishops", "Phase.Opening", function (entity) {

    while (true) {

        let bishopsMoves = []
        let bishopsArray = ctx.runQuery(getSpecificType('Bishop', 'White'))
        // let bishopsSet = ctx.runQuery("Piece.White.Bishop")
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        //let allCellsArr = Array.from(allCells);

        for (let i = 0; i < bishopsArray.length; i++) {
            let aval = availableDiagonalCellsFromPiece(bishopsArray[i], 7, allCells)[0];
            let aval2 = [];
            for (let j = 0; j < aval.length; j++) {
                if (ESBishopDevelopingMoves.contains(aval[j])) {
                    aval2.push(aval[j]);
                }
            }
            bishopsMoves = bishopsMoves.concat(aval2);
        }

        let bishopsMovesSet = clearDuplicates(bishopsMoves)
        let bishopsMovesToRequest = filterOccupiedCellsMoves(bishopsMovesSet, cellsSet)

        bishopsMovesSet = bishopsMoves = bishopsArray = cellsSet = allCells = null
        //bp.log.info("mySync : Requesting bishop developing moves")
        mySync({request: bishopsMovesToRequest, waitFor: anyMoves})

    }
});

ctx.bthread("DevelopingKnights", "Phase.Opening", function (entity) {
    while (true) {
        let knightMoves = []
        let knightsArray = ctx.runQuery(getSpecificType('Knight', 'White'))
        let nonOccupiedCellsSet = ctx.runQuery("Cell.all.nonOccupied")

        for (let i = 0; i < knightsArray.length; i++) {
            let availKnightMoves = availableKnightMoves(knightsArray[i])[0];
            let availableKnightMovesTotal = [];
            for (let j = 0; j < availKnightMoves.length; j++) {
                if (ESKnightDevelopingMoves.contains(availKnightMoves[j])) {
                    availableKnightMovesTotal.push(availKnightMoves[j]);
                }
            }
            knightMoves = knightMoves.concat(availableKnightMovesTotal);
        }

        bp.log.info("knight moves length " + knightMoves.length)
        let knightsMovesSet = clearDuplicates(knightMoves)
        let knightsMovesToRequest = filterOccupiedCellsMoves(knightsMovesSet, nonOccupiedCellsSet)
        nonOccupiedCellsSet = knightsArray = knightMoves = knightsMovesSet = null;
        bp.log.info("mySync : Requesting knights developing moves " + knightsMovesToRequest.length)

        mySync({request: knightsMovesToRequest, waitFor: anyMoves})

    }
});

ctx.bthread("DevelopingRooks", "Phase.Opening", function (entity) {
    while (true) {
        let allCells = ctx.runQuery("Cell.all")
        let rookMoves = []
        let rooksArray = ctx.runQuery(getSpecificType('Rook', 'White'))
        let nonOccupiedCellsSet = ctx.runQuery("Cell.all.nonOccupied")

        for (let i = 0; i < rooksArray.length; i++) {
            let availRookMoves = availableStraightCellsFromPiece(rooksArray[i], 7, allCells)[0];
            let availableRookMovesTotal = [];
            for (let j = 0; j < availRookMoves.length; j++) {
                if (ESRookDevelopingMoves.contains(availRookMoves[j])) {
                    availableRookMovesTotal.push(availRookMoves[j]);
                }
            }
            rookMoves = rookMoves.concat(availableRookMovesTotal);
        }

        let rooksMovesSet = clearDuplicates(rookMoves)
        let rooksMovesToRequest = filterOccupiedCellsMoves(rooksMovesSet, nonOccupiedCellsSet)
        nonOccupiedCellsSet = rooksArray = rookMoves = rooksMovesSet = null;
        //bp.log.info("mySync : Requesting knights developing moves")

        mySync({request: rooksMovesToRequest, waitFor: anyMoves})

    }
});

ctx.bthread("DevelopingQueen", "Phase.Opening", function (entity) {

    while (true) {

        let queenMoves = []

        let pieces = ctx.runQuery('Piece.White.All')
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")

        let queen = null
        let foundQueen = false

        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype === 'Queen') {
                queen = pieces[i]
                foundQueen = true
                break;
            }
        }

        if (!foundQueen) {
            mySync({request: []})
        } else {

            let avalDiagonal = availableDiagonalCellsFromPiece(queen, 7, allCells)[0];
            let avalStraight = availableStraightCellsFromPiece(queen, 7, allCells)[0];
            bp.log.info(queen)
            bp.log.info("avalDiagonal ( len =  " + avalDiagonal.length + " ) => " + avalDiagonal)
            bp.log.info("avalStraight ( len =  " + avalStraight.length + " ) => " + avalStraight)
            bp.log.info(ESQueenDevelopingMoves)
            let aval2 = [];

            for (let j = 0; j < avalDiagonal.length; j++) {
                if (ESQueenDevelopingMoves.contains(avalDiagonal[j])) {
                    aval2.push(avalDiagonal[j]);
                }
            }

            for (let j = 0; j < avalStraight.length; j++) {
                if (ESQueenDevelopingMoves.contains(avalStraight[j])) {
                    aval2.push(avalStraight[j]);
                }
            }

            bp.log.info("aval2 ( len =  " + aval2.length + " ) => " + aval2)

            queenMoves = queenMoves.concat(aval2);


            let queenMovesSet = clearDuplicates(queenMoves)
            let queenMovesToRequest = filterOccupiedCellsMoves(queenMovesSet, cellsSet)

            bp.log.info("Queen Moves To Request ( len =  " + queenMovesToRequest.length + " ) => " + queenMovesToRequest)

            queenMovesSet = queenMoves = cellsSet = allCells = null

            //bp.log.info("mySync : Requesting bishop developing moves")
            mySync({request: queenMovesToRequest, waitFor: anyMoves})
        }

    }
});

/*ctx.bthread("DevelopingRooks", "Phase.Opening", function (entity) {

    while (true) {

        let RooksMoves = []
        let RooksSet = ctx.runQuery(getSpecificType('Rook', 'White'))
        // let RooksSet = ctx.runQuery("Piece.White.Rook")
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        let allCellsArr = Array.from(allCells);

        for (let rook of RooksSet.values()) {
            let availableRooksMoves = availableStraightCellsFromPiece(rook, 7, allCellsArr)
            RooksMoves = RooksMoves.concat(availableRooksMoves
                .filter(function (m) {
                    return ESRookDevelopingMoves.contains(m);
                })
            )
        }

        let RooksMovesSet = clearDuplicates(RooksMoves)
        let RooksMovesToRequest = filterOccupiedCellsMoves(RooksMovesSet, cellsSet)
        cellsSet = RooksSet = RooksMoves =  RooksMovesSet = null;
        bp.log.info("mySync : Requesting rooks developing moves")
        mySync({request: RooksMovesToRequest, waitFor: anyMoves})

    }
});*/


ctx.bthread("CenterTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        sync({waitFor: ESCenterCaptureMoves})

        let receivedAdvisor = bp.store.get("Strategy Advisor: Center")
        bp.store.put("Strategy Advisor: Center", receivedAdvisor - 0.5)

        let receivedCounter = bp.store.get("Strategy Counter: Center strengthen moves")
        bp.store.put("Strategy Counter: Center strengthen moves", receivedCounter + 1)
    }
})

ctx.bthread("DevelopTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        sync({waitFor: [ESPawnDevelopingMoves, ESBishopDevelopingMoves, ESKnightDevelopingMoves]})
        //mySync([], [ESCenterCaptureMoves, ESBishopDevelopingMoves], []);
        let receivedCounter = bp.store.get("Strategy Advisor: Develop")
        bp.store.put("Strategy Advisor: Develop", receivedCounter - 0.75)
        receivedCounter = bp.store.get("Strategy Counter: Developing moves")
        bp.store.put("Strategy Counter: Developing moves", receivedCounter + 1)
    }
})

ctx.bthread("FianchettoTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        sync({waitFor: ESFianchettoMoves})
        //mySync([], [ESFianchettoMoves], []);
        let receivedCounter = bp.store.get("Strategy Advisor: Fianchetto")
        bp.store.put("Strategy Advisor: Fianchetto", receivedCounter - 0.3)
        receivedCounter = bp.store.get("Strategy Counter: Fianchetto moves")
        bp.store.put("Strategy Counter: Fianchetto moves", receivedCounter + 1)
    }
})

ctx.bthread("PawnMovesTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        //let e = mySync([], [anyMoves], []);
        if (e.data.piece == "Pawn" && e.data.color == "White") {
            // bp.log.info("COUNT : " + e + e.data.color)
            let receivedAdvisor = bp.store.get("Piece Advisor: Pawn")
            bp.store.put("Piece Advisor: Pawn", receivedAdvisor - 1)
            let recCounter = bp.store.get("Piece Moves Counter: Pawn moves")
            bp.store.put("Piece Moves Counter: Pawn moves", recCounter + 1)
        }
    }
})

ctx.bthread("BishopMovesTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        //let e = mySync([], [anyMoves], []);
        if (e.data.piece == "Bishop" && e.data.color == "White") {
            let receivedAdvisor = bp.store.get("Piece Advisor: Bishop")
            bp.store.put("Piece Advisor: Bishop", receivedAdvisor - 1)
            let recCounter = bp.store.get("Piece Moves Counter: Bishop moves")
            bp.store.put("Piece Moves Counter: Bishop moves", recCounter + 1)
        }
    }
})

ctx.bthread("RookMovesTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        //let e = mySync([], [anyMoves], []);
        if (e.data.piece == "Rook" && e.data.color == "White") {
            let receivedAdvisor = bp.store.get("Piece Advisor: Rook")
            bp.store.put("Piece Advisor: Rook", receivedAdvisor - 1)
            let recCounter = bp.store.get("Piece Moves Counter: Rook moves")
            bp.store.put("Piece Moves Counter: Rook moves", recCounter + 1)
        }
    }
})

ctx.bthread("KnightMovesTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        //let e = mySync([], [anyMoves], []);
        if (e.data.piece == "Knight" && e.data.color == "White") {
            let receivedAdvisor = bp.store.get("Piece Advisor: Knight")
            bp.store.put("Piece Advisor: Knight", receivedAdvisor - 1)
            let recCounter = bp.store.get("Piece Moves Counter: Knight moves")
            bp.store.put("Piece Moves Counter: Knight moves", recCounter + 1)
        }
    }
})

ctx.bthread("QueenMovesTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        //let e = mySync([], [anyMoves], []);
        if (e.data.piece == "Queen" && e.data.color == "White") {
            let receivedAdvisor = bp.store.get("Piece Advisor: Queen")
            bp.store.put("Piece Advisor: Queen", receivedAdvisor - 1)
            let recCounter = bp.store.get("Piece Moves Counter: Queen moves")
            bp.store.put("Piece Moves Counter: Queen moves", recCounter + 1)
            if (recCounter >= 2)
                bp.store.put("Developing the queen too early", 3)
        }
    }
})


ctx.bthread("scholarsMateTrack", "Phase.Opening", function (entity) {
    let e = sync({waitFor: ESScholarsMateMoves1})
    bp.store.put("Game Plan Counter: Scholars Mate", 1)
    let e21 = sync({waitFor: ESScholarsMateMoves2})
    bp.store.put("Game Plan Counter: Scholars Mate", 2)
    let e22 = sync({waitFor: ESScholarsMateMoves2})
    bp.store.put("Game Plan Counter: Scholars Mate", 3)
    let e3 = sync({waitFor: ESScholarsMateMoves3})
    bp.store.put("Game Plan Counter: Scholars Mate", 4)
})

ctx.bthread("deceivingScholarsMateTrack", "Phase.Opening", function (entity) {

    let e = sync({waitFor: ESScholarsMateMoves1})
    bp.store.put("Game Plan Counter: Deceiving Scholars Mate", 1)
    let e21 = sync({waitFor: ESScholarsMateMoves2})
    bp.store.put("Game Plan Counter: Deceiving Scholars Mate", 2)
    let e22 = sync({waitFor: ESDeceivingScholarsMateMoves2})
    bp.store.put("Game Plan Counter: Deceiving Scholars Mate", 3)
    let e23 = sync({waitFor: ESScholarsMateMoves2})
    bp.store.put("Game Plan Counter: Deceiving Scholars Mate", 4)
    let e3 = sync({waitFor: ESScholarsMateMoves3})
    bp.store.put("Game Plan Counter: Deceiving Scholars Mate", 5)

})


// ctx.bthread("mate on f7", "ready to mate on f7", function (entity) {
//     try {
//         bp.log.info("bthread : mate on f7")
//         let pieces = ctx.runQuery('Piece.White.All')
//         let queen = null
//         for (let i = 0; i < pieces.length; i++) {
//             if (pieces[i].subtype === 'Queen' && pieces[i].color === 'White') {
//                 queen = pieces[i]
//                 break
//             }
//         }
//         if (canReachSquare(queen, "f7", false, false) === true) {
//             let move = moveEvent(queen, queen.cellId, "f7");
//             bp.log.info("ready to mate => " + move);
//             bp.store.put("Game Plan Counter: Scholars Mate", 4)
//             // sync({request: move}, 100);
//         }
//     } catch (e) {
//         if (ctx.isEndOfContextException(e)) {
//             bp.store.put("Game Plan Counter: Scholars Mate",  3)
//         }
//         ctx.rethrowException(e)
//     }
//
//
//
//
// })

ctx.bthread("FriedLiverAttackTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: ESFriedLiverAttackMoves})
        let receivedCounter = bp.store.get("Game Plan Counter: Fried Liver Attack")
        bp.store.put("Game Plan Counter: Fried Liver Attack", receivedCounter + 1)
    }
})

ctx.bthread("CapturingSpaceTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: ESControlSpaceMoves})
        let receivedCounter = bp.store.get("Game Plan Counter: Capturing Space")
        bp.store.put("Game Plan Counter: Capturing Space", receivedCounter + 1)
    }
})

function isStrengtheningPawnStructure(dstCell) {
    // 1. Creating Pawn Chain or strong structure       *       *
    //                                                   *       *
    //                                                    *     *
    // 2. Move pawns to support the development of pieces
    bp.log.info("isStrengtheningPawnStructure, dstcell = " + dstCell)
    let defaultReturnValue = false;

    let col = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = dstCell[1] - '0';


    let pieceType = "Pawn";
    let color = "White";
    let allWhitePawns = ctx.runQuery(getSpecificType(pieceType, color))
    bp.log.info(allWhitePawns);
    if (dstCell.startsWith('h') || dstCell.startsWith('a'))
        return defaultReturnValue;
    else {
        let cellsToExplore = [
            getNextChar(dstCell[0]) + getNextChar(dstCell[1]),
            getNextChar(dstCell[0]) + getPrevChar(dstCell[1]),
            getPrevChar(dstCell[0]) + getNextChar(dstCell[1]),
            getPrevChar(dstCell[0]) + getPrevChar(dstCell[1])
        ]

        bp.log.info(cellsToExplore)

        let counter = 0;


        for (let j = 0; j < allWhitePawns.length; j++) {
            if (cellsToExplore.includes(allWhitePawns[j].cellId))
                counter++;
        }

        if (counter >= 2)
            bp.log.info("isStrengtheningPawnStructure : return true")
        return true;

    }
}

ctx.bthread("PawnStructureTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        if (e.data.piece == "Pawn" && e.data.color == "White" && isStrengtheningPawnStructure(e.data.dst)) {
            let receivedCounter = bp.store.get("Game Plan Counter: Strengthen Pawn Structure")
            bp.store.put("Game Plan Counter: Strengthen Pawn Structure", receivedCounter + 1)
        }

    }
})

ctx.bthread("PreventingAttacksOnBG4", "Phase.Opening", function (entity) {
    for (let i = 1; i <= 4; i++) {
        sync({waitFor: ESChasingAndPreventingAttacksOnBG4})
        // let receivedCounter = bp.store.get("Counter: Preventing b4, g4 Attacks")
        bp.store.put("Moves Counter: Preventing b4, g4 Attacks", i - 1)
    }
})


// Helper functions
function isAttackingDiagonal(piece, dstCell, range, canAttackBackwards) {
    let playerPieces = ctx.runQuery("Piece.White.All")
    let opponentPieces = ctx.runQuery("Piece.Black.All")
    let allCells = ctx.runQuery("Cell.all")

    let col = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = dstCell[1] - '0';

    let checkMeNorthWest = true;
    let checkMeNorthEast = true;
    let checkMeSouthWest = true;
    let checkMeSouthEast = true;

    if (!canAttackBackwards) {
        checkMeSouthWest = false;
        checkMeSouthEast = false;
    }

    bp.log.info("~~ LOG (1468) ~~ " + piece + dstCell + range + canAttackBackwards + row + col)

    for (let i = 1; i <= range; i++) {
        if (row + i <= 7 && row + i >= 0 && col + i <= 7 && col + i >= 0 && checkMeNorthEast) {
            if (numericCellToCell(row + i, col + i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeNorthEast = false;
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row + i, col + i, allCells).pieceId))
                bp.log.info("~~ LOG (1491) ~~ " + JSON.stringify(pieceInCell))
                if (pieceInCell.color === 'Black') {
                    return true;
                }
            }
        }
        if (row - i <= 7 && row - i >= 1 && col + i <= 7 && col + i >= 0 && checkMeSouthEast) {
            if (numericCellToCell(row - i, col + i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeSouthEast = false;
                bp.log.info("~~ LOG (1501) ~~ " + numericCellToCell(row - i, col + i, allCells))
            }
        }
        if (row + i <= 7 && row + i >= 0 && col - i <= 7 && col - i >= 0 && checkMeNorthWest) {
            if (numericCellToCell(row + i, col - i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeNorthWest = false;
                bp.log.info("~~ LOG (1509) ~~ " + numericCellToCell(row + i, col - i, allCells))
            }
        }
        if (row - i <= 7 && row - i >= 1 && col - i <= 7 && col - i >= 0 && checkMeSouthWest) {
            if (numericCellToCell(row - i, col - i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeSouthWest = false;
                bp.log.info("~~ LOG (1517) ~~ " + numericCellToCell(row - i, col - i, allCells))
            }
        }
    }

}

function isAttackingStraight(piece, dstCell) {
    let playerPieces = ctx.runQuery("Piece.White.All")
    let opponentPieces = ctx.runQuery("Piece.Black.All")
    let allCells = ctx.runQuery("Cell.all")


}

function isAttackingKnight(dstCell) {
}

function isDefendedPiece(dstCell, color) {
    let playerPieces = ctx.runQuery("Piece." + color + ".All") // Get all player pieces

    for (let pieceIndex = 0; pieceIndex < playerPieces.length; pieceIndex++) {
        let canDefend = canReachSquare(playerPieces[pieceIndex], dstCell, false, false)
        if (canDefend) {
            return true
        }
    }

    return false
}

function pinning(piece, pieceCell, straightMovement, diagonalMovement) {
    // First, determine whether a pinning is even feasible - the moved piece need to "see" the opponent king
    let opponentKingCell = ctx.runQuery(getOpponentKingCell("White"))[0].cellId
    if ((pieceCell.charAt(0) === opponentKingCell.charAt(0) || pieceCell.charAt(0) === opponentKingCell.charAt(0)) && straightMovement) {
        bp.log.info("~~ LOG (1556) ~~ return true, reason: straight")
        if (whatStandsBetweenPieceAndOpponentKing(piece, pieceCell, "Straight")) {
            return true;
        }
    }

    let col = pieceCell[0].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    let row = pieceCell[1] - '0';
    let colKing = opponentKingCell[0].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    let rowKing = opponentKingCell[1] - '0';

    if (Math.abs(col - colKing) === (Math.abs(row - rowKing)) && diagonalMovement) {
        bp.log.info("~~ LOG (1565) ~~ return true, reason: diagonal" + pieceCell + " " + opponentKingCell)
        if (whatStandsBetweenPieceAndOpponentKing(piece, pieceCell, "Diagonal")) {
            return true;
        }
    }
}

function whatStandsBetweenPieceAndOpponentKing(piece, pieceCell, straightOrDiagonal) {
    // Piece can "see" the opponent king. Determine now if just one opponent piece — the pinned piece — separates the king and the player's piece

    let opponentKingCell = ctx.runQuery(getOpponentKingCell("White"))[0].cellId

    let separatingCells = allCellsBetweenSourceAndDestination(pieceCell, opponentKingCell, straightOrDiagonal)
    let counterPieces = 0
    let counterOpponentPieces = 0

    for (let cellIndex = 0; cellIndex < separatingCells.length; cellIndex++) {
        let pieceOnCell = ctx.runQuery(getSpecificPieceOnCell(separatingCells[cellIndex]))
        if (pieceOnCell[0] !== undefined) {
            bp.log.info("~~ LOG (1587) ~~ There is a piece on " + separatingCells[cellIndex] + " = " + JSON.stringify(pieceOnCell[0]))
            counterPieces++;
        }
        if (pieceOnCell[0] !== undefined && pieceOnCell[0].color === "Black") {
            counterOpponentPieces++;
        }
    }

    bp.log.info("~~ LOG (1589) ~~ Between " + pieceCell + " and " + opponentKingCell + " there are " + counterPieces + " pieces!, " + counterOpponentPieces +
        " of them are black")
}

function allCellsBetweenSourceAndDestination(src, dst, straightOrDiagonal) {
    bp.log.info("~~ LOG (1585) ~~ Check allCellsBetweenSourceAndDestination")
    let cells = []
    if (straightOrDiagonal === "Straight") {
        if (src.charAt(1) === dst.charAt(1)) {
            if (src.charAt(0) < dst.charAt(0)) {
                for (let col = getNextChar(src.charAt(0)); col < dst.charAt(0); col = getNextChar(col)) {
                    cells.push(col + src.charAt(1))
                }
            } else {
                for (let col = getNextChar(dst.charAt(0)); col < src.charAt(0); col = getNextChar(col)) {
                    cells.push(col + src.charAt(1))
                }
            }
        } else {
            bp.log.info("~~ LOG (1600) ~~" + src.charAt(1) + "," + dst.charAt(1))
            if (src.charAt(1) < dst.charAt(1)) {
                bp.log.info("~~ LOG (1601) ~~")
                for (let row = getNextChar(src.charAt(1)); row < dst.charAt(1); row = getNextChar(row)) {
                    cells.push(src.charAt(0) + row)
                }
            } else {
                for (let row = getNextChar(dst.charAt(1)); row < src.charAt(1); row = getNextChar(row)) {
                    cells.push(src.charAt(0) + row)
                }
            }
        }
    } else {
        bp.log.info("Diagonal")
        if (src.charAt(0) > dst.charAt(0) && src.charAt(1) > dst.charAt(1)) {
            for (let row = getNextChar(dst.charAt(1)), col = getNextChar(dst.charAt(0)); row < src.charAt(1); row = getNextChar(row), col = getNextChar(col)) {
                cells.push(col + row)
            }
        } else if (src.charAt(0) > dst.charAt(0) && src.charAt(1) < dst.charAt(1)) {
            for (let row = getNextChar(src.charAt(1)), col = getPrevChar(src.charAt(0)); row < dst.charAt(1); row = getNextChar(row), col = getPrevChar(col)) {
                cells.push(col + row)
            }
        } else if (src.charAt(0) < dst.charAt(0) && src.charAt(1) > dst.charAt(1)) {
            for (let row = getNextChar(dst.charAt(1)), col = getPrevChar(dst.charAt(0)); row < src.charAt(1); row = getNextChar(row), col = getPrevChar(col)) {
                cells.push(col + row)
            }
        } else {
            for (let row = getNextChar(src.charAt(1)), col = getNextChar(src.charAt(0)); row < dst.charAt(1); row = getNextChar(row), col = getNextChar(col)) {
                bp.log.info("row - " + row + ", col - " + col)
                cells.push(col + row)
            }
        }
    }

    bp.log.info("~~ LOG (1629) ~~ Check allCellsBetweenSourceAndDestination between " + src + " -> " + dst + " = " + cells)
    return cells;
}

function isAttackingOpponentPieceOrDefending(piece, dstCell, attacking) {
    bp.log.info("~~ LOG (1552) ~~ isAttackingOpponentPiece: " + piece + "," + dstCell)

    let playerPieces = ctx.runQuery("Piece.White.All")
    let opponentPieces = ctx.runQuery("Piece.Black.All")
    let allCells = ctx.runQuery("Cell.all")

    let piecesArray = []
    let attackingCells = []
    let availableMoves = []
    let specificPiece = null

    if (piece === "Pawn") { // Pawn can only defend the upward diagonal cell ( if the pawn is at the edge of the board \ cells )
        bp.log.info("~~ LOG (1564) ~~ isAttackingOpponentPiece: " + piece + "," + dstCell)
        isAttackingDiagonal(piece, dstCell, 1, false);
        if (dstCell[0] !== 'a')
            attackingCells.push(
                GiveMeCell((getPrevChar(dstCell[0]) + getNextChar(dstCell[1])), allCells)
            )
        if (dstCell[0] !== 'h')
            attackingCells.push(
                GiveMeCell((getNextChar(dstCell[0]) + getNextChar(dstCell[1])), allCells)
            )
    } else {
        piecesArray = ctx.runQuery("Piece.All")

        for (let i = 0; i < piecesArray.length; i++) {
            if (piecesArray[i].cellId === dstCell) {
                specificPiece = piecesArray[i] // Found the piece
                break
            }
        }
        if (piece === "Bishop" && specificPiece != null) {
            bp.log.info("Bishop on " + dstCell)
            attackingCells = availableDiagonalCellsFromPiece(specificPiece, 12, allCells)[1]

        } else if (piece === "Knight") {
            bp.log.info("Knight on " + dstCell + ", " + specificPiece)
            attackingCells = availableKnightMoves(specificPiece)[1]

        } else if (piece === "Rook") {
            bp.log.info("Rook on " + dstCell)
            attackingCells = availableStraightCellsFromPiece(specificPiece, 7, allCells)[1]

        } else if (piece === "Queen") {
            bp.log.info("Queen on " + dstCell)
            pinning(piece, dstCell, true, true)
            attackingCells = availableDiagonalCellsFromPiece(specificPiece, 7, allCells)[1]
            let attackingCells2 = availableStraightCellsFromPiece(specificPiece, 7, allCells)[1]
            for (let i = 0; i < attackingCells2.length; i++) {
                attackingCells.push(attackingCells2[i])
            }
        }
    }

    let attackingCellsIDs = []
    bp.log.info("~~ LOG ~~ isAttackingOpponentPieceOrDefending : ( " + piece + " )Cells to watch (length = " + attackingCells.length + ")")
    for (let i = 0; i < attackingCells.length; i++) {
        bp.log.info("~~ LOG (1539) ~~ " + attackingCells[i].id)
        attackingCellsIDs.push(attackingCells[i].id)
    }

    if (attacking) {
        bp.log.info("attacking mode")
        for (let i = 0; i < opponentPieces.length; i++) {
            if (attackingCellsIDs.includes(opponentPieces[i].cellId)) {
                bp.log.info("isAttackingOpponentPiece : " + piece + " Attacking opponent's piece on " + opponentPieces[i].cellId)
                return true;
            }
        }

        return false
    } else {
        bp.log.info("defending mode")
        let playerPieces = ctx.runQuery("Piece.White.All")
        bp.log.info(playerPieces)
        for (let i = 0; i < playerPieces.length; i++) {
            if (attackingCellsIDs.includes(playerPieces[i].cellId)) {
                bp.log.info("isAttackingOpponentPiece : " + piece + " Defending player's piece on " + playerPieces[i].cellId)
                return true;
            }
        }

        return false
    }
}

/*
This behavioral thread follows one of the basics strategies in the game of chess in general, in particular in the opening stage.
One of the ways to get an advantage in the game of chess, and eventually win, is to capture the pieces of the opponent.
One can do so by attacking the opponent's pieces and eventually capture them.
TODO: Add Documentation About Pinning
*/
ctx.bthread("AttackingAndPinningTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        bp.log.info("~~ LOG (1653) ~~ " + JSON.stringify(e.data))
        if (e.data.color == "White" && isAttackingOpponentPieceOrDefending(e.data.piece, e.data.dst, true)) {

            // let receivedCounter = bp.store.get("Moves Counter: Attacking")
            // bp.store.put("Moves Counter: Attacking", receivedCounter + 1)
        }
    }
})

// Defending

ctx.bthread("DefendingTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        if (e.data.color == "White" && isAttackingOpponentPieceOrDefending(e.data.piece, e.data.dst, false)) {
            let receivedCounter = bp.store.get("Moves Counter: Defending")
            bp.store.put("Moves Counter: Defending", receivedCounter + 0.5)
        }
    }
})

ctx.bthread("GeneralTacticsTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        if (e.data.color === "White") {
            if (e.data.takes === true) {
                bp.log.info("UPDATING GENERAL TACTICS, " + e.data)
                let returnValuesList = TradingGameTacticCheck(e, e.data.color)
                bp.store.put("General Tactics: Take Free Piece", returnValuesList[0])
                bp.store.put("General Tactics: Equal Trade", returnValuesList[1])
                bp.store.put("General Tactics: Worthwhile Trade", returnValuesList[2])
                bp.store.put("General Tactics: Worthless Trade", returnValuesList[3])
            } else {
                bp.store.put("General Tactics: Take Free Piece", 0)
                bp.store.put("General Tactics: Equal Trade", 0)
                bp.store.put("General Tactics: Worthwhile Trade", 0)
                bp.store.put("General Tactics: Worthless Trade", 0)
            }
        } else {
            bp.store.put("General Tactics: Take Free Piece", 0)
            bp.store.put("General Tactics: Equal Trade", 0)
            bp.store.put("General Tactics: Worthwhile Trade", 0)
            bp.store.put("General Tactics: Worthless Trade", 0)
        }
    }
})


/*
Those functions are responsible for finding unoccupied cells in a given distance.
Those cells are potential destination cells of moves.
*/

function availableStraightCellsFromPiece(piece, distance, allCells) {
    let col = piece.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (piece.cellId[1] - '0');

    let availableCells = [];
    let availableMoves = [];
    let cellsWithPiece = [];

    let checkMeWest = true;
    let checkMeEast = true;
    let checkMeSouth = true;
    let checkMeNorth = true;

    for (let i = 1; i <= distance; i++) {
        // bp.log.info("i = " + i)
        if (row + i <= 7 && row + i >= 0 && checkMeNorth) {
            if (numericCellToCell(row + i, col, allCells).pieceId === undefined) {
                availableCells.push({row: row + distance, col: col});
                availableMoves.push(moveEvent(piece.subtype, jToCol(col) + row, jToCol(col) + (row + i), piece.color));
            } else {
                checkMeNorth = false
                cellsWithPiece.push(numericCellToCell(row + i, col, allCells))
            }
        }
        if (row - i <= 7 && row - i > 0 && checkMeSouth) {
            if (numericCellToCell(row - i, col, allCells).pieceId === undefined) {
                availableCells.push({row: row - distance, col: col});
                availableMoves.push(moveEvent(piece.subtype, jToCol(col) + row, jToCol(col) + (row - i), piece.color));
            } else {
                checkMeSouth = false
                cellsWithPiece.push(numericCellToCell(row - i, col, allCells))
            }
        }
        if (col + i <= 7 && col + i >= 0 && checkMeEast) {
            if (numericCellToCell(row, col + i, allCells).pieceId === undefined) {
                availableCells.push({row: row, col: col + distance});
                availableMoves.push(moveEvent(piece.subtype, jToCol(col) + row, jToCol(col + i) + (row), piece.color));
            } else {
                checkMeEast = false
                cellsWithPiece.push(numericCellToCell(row, col + i, allCells).pieceId)
            }
        }
        if (col - i <= 7 && col - i >= 0 && checkMeWest) {
            if (numericCellToCell(row, col - i, allCells).pieceId === undefined) {
                availableCells.push({row: row, col: col - distance});
                availableMoves.push(moveEvent(piece.subtype, jToCol(col) + row, jToCol(col - i) + (row), piece.color));
            } else {
                checkMeWest = false
                cellsWithPiece.push(numericCellToCell(row, col - i, allCells).pieceId)
            }
        }
    }
    bp.log.info("returning cellsWithPieces with length " + cellsWithPiece.length)
    return [availableMoves, cellsWithPiece]
}

function availableStraightCellsFromPawn(pawn, distance, allCells) {

    let col = pawn.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (pawn.cellId[1] - '0');


    if (distance == 2 && row != 2) {
        return [];
    }

    let availableCells = [];
    let availableMoves = [];

    if (row + 1 <= 7 && row + 1 >= 0) {
        if (numericCellToCell(row + 1, col, allCells).pieceId == undefined) {
            availableCells.push({row: row + 1, col: col});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col) + (row + 1), pawn.color));
        }
    }

    if (row + 2 <= 7 && row + 2 >= 0) {
        if (numericCellToCell(row + 2, col, allCells).pieceId == undefined) {
            availableCells.push({row: row + 2, col: col});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col) + (row + 2), pawn.color));
        }
    }

    if (col + 1 <= 7 && col + 1 >= 0) {
        if (numericCellToCell(row + 1, col + 1, allCells).pieceId != undefined) {
            availableCells.push({row: row + 1, col: col + 1});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col + 1) + (row + 1), pawn.color));
        }
    }

    if (col - 1 <= 7 && col - 1 >= 0) {
        if (numericCellToCell(row + 1, col - 1, allCells).pieceId != undefined) {
            availableCells.push({row: row + 1, col: col - 1});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col - 1) + (row + 1), pawn.color));
        }
    }

    return availableMoves
}

function availableKnightMoves(knight) {
    bp.log.info("availableKnightMoves")
    let allCells = ctx.runQuery("Cell.all")
    let col = knight.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (knight.cellId[1] - '0');
    bp.log.info("Row - " + row)
    let availableMoves = []
    let cellsWithPiece = []
    if (row + 1 <= 7 && row + 1 >= 0 && col + 2 <= 7 && col + 2 > 0) {
        if (numericCellToCell(row + 1, col + 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 2) + (row + 1), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row + 1, col + 2, allCells))
        }
    }
    if (row + 1 <= 7 && row + 1 >= 0 && col - 2 <= 7 && col - 2 >= 0) {
        if (numericCellToCell(row + 1, col - 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 2) + (row + 1), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row + 1, col - 2, allCells))
        }
    }
    if (row - 1 <= 7 && (row - 1) > 0 && col + 2 <= 7 && col + 2 > 0) {
        if (numericCellToCell(row - 1, col + 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 2) + (row - 1), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row - 1, col + 2, allCells))
        }
    }
    if (row - 1 <= 7 && (row - 1) > 0 && col - 2 <= 7 && col - 2 >= 0) {
        if (numericCellToCell(row - 1, col - 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 2) + (row - 1), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row - 1, col - 2, allCells))
        }
    }

    if (row + 2 <= 7 && row + 2 > 0 && col + 1 <= 7 && col + 1 > 0) {
        if (numericCellToCell(row + 2, col + 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 1) + (row + 2), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row + 2, col + 1, allCells))
        }
    }
    if (row - 2 <= 7 && (row - 2) > 0 && col + 1 <= 7 && col + 1 > 0) {
        if (numericCellToCell(row - 2, col + 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 1) + (row - 2), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row - 2, col + 1, allCells))
        }
    }
    if (row + 2 <= 7 && row + 2 > 0 && col - 1 <= 7 && col - 1 >= 0) {
        if (numericCellToCell(row + 2, col - 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 1) + (row + 2), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row + 2, col - 1, allCells))
        }
    }
    if (row - 2 <= 7 && (row - 2) > 0 && col - 1 <= 7 && col - 1 >= 0) {
        if (numericCellToCell(row - 2, col - 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 1) + (row - 2), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row - 2, col - 1, allCells))
        }
    }

    bp.log.info("Available Knight Moves Returned - " + availableMoves)
    bp.log.info("returning cellsWithPieces with length " + cellsWithPiece.length)
    return [availableMoves, cellsWithPiece]

}

function jToCol(j) {
    let j_char = ''
    switch (j) {
        case 0:
            j_char = 'a';
            break;
        case 1:
            j_char = 'b';
            break;
        case 2:
            j_char = 'c';
            break;
        case 3:
            j_char = 'd';
            break;
        case 4:
            j_char = 'e';
            break;
        case 5:
            j_char = 'f';
            break;
        case 6:
            j_char = 'g';
            break;
        case 7:
            j_char = 'h';
            break;
    }
    return j_char;
}

function GiveMeCell(requestedID, allCells) {
    //bp.log.info("*** GiveMeCell : requestedID - " + requestedID + "\t allcells - " + allCells + " ***")
    // bp.log.info(("*** GiveMeCell : requestedID - " + requestedID + " ***"))
    for (let i = 0; i < allCells.length; i++) {
        let cell = allCells[i]
        if (cell.id === requestedID) {
            //bp.log.info("*** GiveMeCell : Returned - " + requestedID + " ***")
            return cell;
        }
    }
    //bp.log.info("*** GiveMeCell : Returned Null!! ***")
    return null;
}


function availableDiagonalCellsFromPiece(piece, distance, allCells) {
    bp.log.info("availableDiagonalCellsFromPiece -> " + piece + ", " + distance + ", " + allCells)
    let col = piece.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (piece.cellId[1] - '0');


    /*if (piece.subtype == "Queen") {
        bp.log.info("availableDiagonalCellsFromPiece : Queen at [ " + col + ", " + row + " ]")
    }*/


    let availableCells = [];

    let availableMoves = [];

    let cellsWithPieces = []

    let checkMeNorthWest = true;
    let checkMeNorthEast = true;
    let checkMeSouthWest = true;
    let checkMeSouthEast = true;

    for (let i = 1; i <= distance; i++) {
        if (row + i <= 7 && row + i >= 0 && col + i <= 7 && col + i >= 0 && checkMeNorthEast) {
            if (numericCellToCell(row + i, col + i, allCells).pieceId === undefined) {
                availableCells.push({row: row + i, col: col + i});
                availableMoves.push(moveEvent(piece.subtype, jToCol(col) + row, jToCol(col + i) + (row + i), piece.color));
            } else {
                checkMeNorthEast = false;
                cellsWithPieces.push(numericCellToCell(row + i, col + i, allCells))
            }
        }
        if (row - i <= 7 && row - i >= 1 && col + i <= 7 && col + i >= 0 && checkMeSouthEast) {
            if (numericCellToCell(row - i, col + i, allCells).pieceId === undefined) {
                availableCells.push({row: row - i, col: col + i});
                availableMoves.push(moveEvent(piece.subtype, jToCol(col) + row, jToCol(col + i) + (row - i), piece.color));
            } else {
                checkMeSouthEast = false;
                cellsWithPieces.push(numericCellToCell(row - i, col + i, allCells))
            }
        }
        if (row + i <= 7 && row + i >= 0 && col - i <= 7 && col - i >= 0 && checkMeNorthWest) {
            if (numericCellToCell(row + i, col - i, allCells).pieceId === undefined) {
                availableCells.push({row: row + i, col: col - i});
                availableMoves.push(moveEvent(piece.subtype, jToCol(col) + row, jToCol(col - i) + (row + i), piece.color));
            } else {
                checkMeNorthWest = false;
                cellsWithPieces.push(numericCellToCell(row + i, col - i, allCells))
            }
        }
        if (row - i <= 7 && row - i >= 1 && col - i <= 7 && col - i >= 0 && checkMeSouthWest) {
            if (numericCellToCell(row - i, col - i, allCells).pieceId === undefined) {
                availableCells.push({row: row - i, col: col - i});
                availableMoves.push(moveEvent(piece.subtype, jToCol(col) + row, jToCol(col - i) + (row - i), piece.color));
            } else {
                checkMeSouthWest = false;
                cellsWithPieces.push(numericCellToCell(row - i, col - i, allCells))
            }
        }
    }
    bp.log.info("returning cellsWithPieces with length " + cellsWithPieces.length)
    bp.log.info("returning availableMoves with length " + availableMoves.length)
    return [availableMoves, cellsWithPieces]

}

// Visualization ( Help debug process )
ctx.bthread("Visualize", "Phase.Opening", function (entity) {

    allCellsBetweenSourceAndDestination("e2", "g4", "Diagonal")
    allCellsBetweenSourceAndDestination("g4", "e2", "Diagonal")
    allCellsBetweenSourceAndDestination("h5", "e8", "Diagonal")
    allCellsBetweenSourceAndDestination("e8", "h5", "Diagonal")
    allCellsBetweenSourceAndDestination("a4", "h4", "Straight")
    allCellsBetweenSourceAndDestination("h4", "a4", "Straight")
    allCellsBetweenSourceAndDestination("e2", "e8", "Straight")
    allCellsBetweenSourceAndDestination("e8", "e2", "Straight")


    // White pieces are represented by capital characters, whereas non-capital characters are used to symbolize black pieces

    const currentBoard = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],

        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],

        ['*', '*', '*', '*', '*', '*', '*', '*'],

        ['*', '*', '*', '*', '*', '*', '*', '*'],

        ['*', '*', '*', '*', '*', '*', '*', '*'],

        ['*', '*', '*', '*', '*', '*', '*', '*'],

        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],

        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
    ]

    while (true) {
        let move = mySync({waitFor: anyMoves}); // To update the current position, wait for any moves to be made

        let srcRow = move.data.src[1] - '0';
        let srcCol = move.data.src[0].charCodeAt(0) - 'a'.charCodeAt(0);
        let dstRow = move.data.dst[1] - '0';
        let dstCol = move.data.dst[0].charCodeAt(0) - 'a'.charCodeAt(0);

        let movedPiece = currentBoard[8 - srcRow][srcCol];

        currentBoard[8 - srcRow][srcCol] = '*'; // The previously occupied cell

        currentBoard[8 - dstRow][dstCol] = movedPiece;

        if ((dstRow === 8 || dstRow === 1) && move.data.piece === "Pawn") // Queening
        {
            currentBoard[Math.abs(dstRow - 8)][dstCol] = dstRow === 8 ? 'Q' : 'q';
        }

        // Visualize
        for (let i = 0; i < 8; i++) {
            bp.log.info(ANSI_PURPLE + currentBoard[i][0] + "  " + currentBoard[i][1] + "  " + currentBoard[i][2] + "  " +
                currentBoard[i][3] + "  " + currentBoard[i][4] + "  " + currentBoard[i][5] + "  " +
                currentBoard[i][6] + "  " + currentBoard[i][7] + ANSI_RESET);
        }
    }
});

// Helper function : Convert numeric row & column values to chess board cell
function numericCellToCell(i, j, allCells) {
    // bp.log.info ( "NumericCellToCell : " + j + ", " + i + ", allCells: " + allCells)

    // i & j can contain any value in range [0,7]

    // Todo: simplify switch case code to arithmetic of char (j_char = 'a' + j)
    let j_char = '0';
    switch (j) {
        case 0:
            j_char = 'a';
            break;
        case 1:
            j_char = 'b';
            break;
        case 2:
            j_char = 'c';
            break;
        case 3:
            j_char = 'd';
            break;
        case 4:
            j_char = 'e';
            break;
        case 5:
            j_char = 'f';
            break;
        case 6:
            j_char = 'g';
            break;
        case 7:
            j_char = 'h';
            break;
    }

    // bp.log.info ( "NumericCellToCell : " + (j_char + i) )
    return GiveMeCell(j_char + i, allCells);

}