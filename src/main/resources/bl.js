/*
    Todo : En passant handling
*/
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

let ANSI_RESET = "\u001B[0m";
let ANSI_CYAN = "\u001B[36m";
let TAKES = 'x';
let QUEENING = '=';

function startsWithCapital(word) {
    return word.charAt(0) === word.charAt(0).toUpperCase()
}

// Helper function : Find if there any pieces in between srcCell And dstCell to prevent "jumping" above pieces
function noPiecesInBetween(srcCell, dstCell) {
    bp.log.info("noPiecesInBetween : " + srcCell + " => " + dstCell)
    let nonOccupiedCellsSet = ctx.runQuery("Cell.all.nonOccupied")
    bp.log.info(nonOccupiedCellsSet)
    let nonOccupiedCellsIds = []
    for (let cellIndex = 0; cellIndex < nonOccupiedCellsSet.length; cellIndex++) {
        //bp.log.info(nonOccupiedCellsSet[cellIndex].id)
        nonOccupiedCellsIds.push(nonOccupiedCellsSet[cellIndex].id)
    }
    if (srcCell[0].charCodeAt(0) === dstCell[0].charCodeAt(0)) // Same Column
    {
        bp.log.info("Same Column")
        // Run through rows indexes
        if (srcCell[1] > dstCell[1]) {
            bp.log.info("Same Column (option 1)")
            for (let rowIndex = String.fromCharCode(dstCell[1].charCodeAt(0) + 1); rowIndex < srcCell[1]; rowIndex++) {
                bp.log.info("noPiecesInBetween : Inspecting " + (srcCell[0] + rowIndex))
                if (!(nonOccupiedCellsIds.includes(srcCell[0] + rowIndex)))
                    return false;
            }
        } else {
            bp.log.info("Same Column (option 2)")
            for (let rowIndex = String.fromCharCode(srcCell[1].charCodeAt(0) + 1); rowIndex < dstCell[1]; rowIndex++) {
                bp.log.info("noPiecesInBetween : Inspecting " + (srcCell[0] + rowIndex))
                if (!(nonOccupiedCellsIds.includes(srcCell[0] + rowIndex)))
                    return false;
            }
        }
    } else if (srcCell[1] === dstCell[1]) // Same Row
    {
        bp.log.info("Same Row")
        // Run through rows indexes
        if (srcCell[0] > dstCell[0]) {
            bp.log.info("Same Row (option 1)")

            for (let colIndex = String.fromCharCode(dstCell[0].charCodeAt(0) + 1); colIndex < srcCell[0]; colIndex++) {
                bp.log.info("noPiecesInBetween : Inspecting " + colIndex + srcCell[1])
                if (!(nonOccupiedCellsIds.includes(colIndex + srcCell[1]))) {
                    bp.log.info("noPiecesInBetween, Returning False");
                    return false;
                }
            }
        } else {
            bp.log.info("Same Row (option 2)")

            for (let colIndex = String.fromCharCode(srcCell[0].charCodeAt(0) + 1); colIndex < dstCell[0]; colIndex++) {
                bp.log.info("noPiecesInBetween : Inspecting " + colIndex + srcCell[1])
                if (!(nonOccupiedCellsIds.includes(colIndex + srcCell[1]))) {
                    bp.log.info("noPiecesInBetween, Returning False");
                    return false;
                }
            }
        }
    } else {
        // For now, Todo: find edge cases
        return false
    }
    bp.log.info("noPiecesInBetween, Returning True");
    return true;

}

function canReachSquare(piece, dstCell, takes, enPassant) {
    bp.log.info("In canReachSquare")
    bp.log.info("enPassant = " + enPassant + ", takes = " + takes)
    bp.log.info(piece.subtype)
    bp.log.info(piece.cellId)
    bp.log.info(dstCell)
    let colToTakePawn = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let rowToTakePawn = (dstCell[1] - '0');
    let allCells = ctx.runQuery("Cell.all")
    bp.log.info(allCells)
    if (piece.subtype == "Pawn") {
        if (dstCell[0] == piece.cellId[0] &&
            (Math.abs(dstCell[1] - piece.cellId[1]) == 2 || Math.abs(dstCell[1] - piece.cellId[1]) == 1)
            && !takes) {
            bp.log.info("Found!! ( pawn Advances )")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId != undefined && takes) {
            bp.log.info("Found!! ( pawn Takes ) ")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId == undefined && enPassant) {

            bp.log.info("Found!! ( pawn Takes En passant ) ")
            return true;
        }
        // return true;*/
        return false;
    } else if (piece.subtype == "Knight") {
        if (
            (Math.abs(dstCell[1] - piece.cellId[1]) === 2 && Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 1) ||
            (Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 2 && Math.abs(dstCell[1] - piece.cellId[1]) === 1)
        ) {
            bp.log.info("Found!!")
            return true;
        }
        return false;
    } else if (piece.subtype == "Queen") {
        return true;
    } else if (piece.subtype == "Bishop") {
        if (
            Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0))
        ) {
            bp.log.info("Found!!")
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
            noPiecesInBetween(piece.cellId, dstCell)
        ) {
            bp.log.info("Found Rook Move!!")
            return true;
        }
    }

    return false;

}

function handleShortCastle(color, pieces) {
    bp.log.info("~~ handleShortCastle ~~ " + color)
    //let piecesValues = Array.from(pieces);
    if (color == "White") {
        let king, rook;
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "h1") {
                rook = pieces[i];
                bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "g1");
        bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "f1");
        bp.log.info(eventKing);
        sync({request: eventRook}, 100);
        // transaction
    } else {
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "h8") {
                rook = pieces[i];
                bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "g8");
        bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "f8");
        bp.log.info(eventKing);
        sync({request: eventRook}, 100);
    }
}

function handleLongCastle(color, pieces) {
    bp.log.info("~~ handleLongCastle ~~ " + color)

    if (color == "White") {
        let king, rook;
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                bp.log.info("~~ handleLongCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "a1") {
                rook = pieces[i];
                bp.log.info("~~ handleLongCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "c1");
        bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "d1");
        bp.log.info(eventKing);
        sync({request: eventRook}, 100);
        // transaction
    } else {
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "a8") {
                rook = pieces[i];
                bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "c8");
        bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "d8");
        bp.log.info(eventKing);
        sync({request: eventRook}, 100);
    }
}

function findPieceThatCanReachToEndSquare(piecePrefix, dstCell, color, takes, enPassant, enPassantPieceCellId) {
    bp.log.info("In findPieceThatCanReachToEndSquare (En passant - " + enPassant + ", enPassantPieceCellId - " + enPassantPieceCellId + ")")
    bp.log.info(piecePrefix)
    bp.log.info(dstCell)
    bp.log.info(color)
    let optionalCol = "";
    if (dstCell.length === 3) // Optional column appears
    {
        optionalCol = dstCell.charAt(0);
        dstCell = dstCell.substr(1);
        bp.log.info("optionalCol " + optionalCol)
        bp.log.info("dst cell " + dstCell)
    }
    let pieceType = prefixDictBL[piecePrefix];
    // bp.log.info('piece type={0}',pieceType)
    let allPiecesOfType = ctx.runQuery(getSpecificType(pieceType, color))


    let allPieces = ctx.runQuery("Piece.White.All")
    bp.log.info(allPieces)


    bp.log.info('{0} pieces fit the description of the move', allPiecesOfType.length)
    // let allPiecesOfType = ctx.runQuery("Piece.White." + pieceType)
    //let allPiecesOfTypeValues = Array.from(allPiecesOfType);
    bp.log.info(allPiecesOfType)
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
            bp.log.info("Checking piece that fits optional col!!" + optionalCol + " " + allPiecesOfType[i].cellId.charAt(0));
            if (allPiecesOfType[i].cellId.charAt(0) == optionalCol) {
                if (canReachSquare(allPiecesOfType[i], dstCell)) {
                    // bp.log.info(allPiecesOfTypeValues[i]);
                    bp.log.info("IN Checking piece that fits optional col!!");
                    return allPiecesOfType[i];
                }
            }
        }
    }
}

const allMovesList = (function () {
    let moves = pgn.split(" ");
    let allMovesList = [];
    for (let i = 0; i < moves.length; i++) {
        if (i % 2 === 1) { // index is even
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

ctx.bthread("ParsePGNAndSimulateGame", "Phase.Opening", function (entity) {
    let player = '';
    let checkmate = false;
    let enPassant = false;
    bp.log.info("allMovesList => " + allMovesList)
    for (let i = 0; i < allMovesList.length; i++) {
        enPassant = false;
        (i % 2 === 0) ? player = 'White' : player = 'Black';
        let move = allMovesList[i]
        let pieces = ctx.runQuery("Piece." + player + ".All");
        bp.log.info("Next PGN Move = {0}", move)

        if (move.charAt(move.length - 1) == '+' || move.charAt(move.length - 1) == '#') {
            bp.log.info("CheckMate!!")
            if (move.charAt(move.length - 1) == '#') {
                checkmate = true;
            }
            move = move.substr(0, move.length - 1)
        }

        bp.log.info("Next PGN Move (Again) = {0}", move)
        if (move.indexOf(TAKES) > -1 && (move.indexOf(QUEENING) > -1)) {
            bp.log.info("Takes & Queen event!! OH MAMA")
            let piece = findPieceThatCanReachToEndSquare(startsWithCapital(move) ? move[0] : "P",
                move.substr(move.indexOf(TAKES) + 1, 2),
                player, true, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr(move.indexOf(TAKES) + 1, 2));
            bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                bp.log.info("Checkmate")
                bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        }
        else if (move.indexOf('x') > -1) {
            bp.log.info("Takes event!!")
            if (
                allMovesList[i][(allMovesList[i].indexOf('x')) + 1] === allMovesList[i - 1][0] &&
                (allMovesList[i - 1].charAt(1) === '4' || allMovesList[i - 1].charAt(1) === '5') &&
                !(allMovesList.includes(allMovesList[i - 1][0] + '3'))
            ) {
                bp.log.info("En passant!!")
                enPassant = true;
            }
            let piece = findPieceThatCanReachToEndSquare(
                startsWithCapital(move) ? move[0] : "P",
                move.substr((move.indexOf('x') + 1)),
                player, true, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr((move.indexOf('x') + 1)));
            bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                bp.log.info("Checkmate")
                bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        } else if (move == "O-O" || move == "O-O-O") {
            bp.log.info("Castling event!!")
            if (move == "O-O") handleShortCastle(player, pieces);
            else if (move == "O-O-O") handleLongCastle(player, pieces);
        } else if ((move.indexOf('=') > -1)) {
            bp.log.info("Queening event");
            let piece = findPieceThatCanReachToEndSquare(
                startsWithCapital(move) ? move[0] : "P",
                move.substr(0, 2),
                player, false, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr(0, 2));
            bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                bp.log.info("Checkmate")
                bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        } else {
            let piece = findPieceThatCanReachToEndSquare(
                startsWithCapital(move) ? move[0] : "P",
                startsWithCapital(move) ? move.substr(1) : move,
                player, false, false);
            // bp.log.info("REACHED SYNC")
            // bp.log.info("piece is {0}", piece)
            let event = moveEvent(piece.subtype, piece.cellId,
                startsWithCapital(move) ? move.length === 3 ? move.substr(1) : move.substr(2) : move);
            bp.log.info("The Move -- " + event);
            if (!checkmate) {
                bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                bp.log.info("Checkmate")
                bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        }
    }
})
;

const AnyCastling = bp.EventSet("AnyCastling", function (e) {
    return false
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
               Two pieces from the same king can move to the same cell ( or take on this cell ) -> R1d1 , fxe5

   2. Center squares - c4, d4, e4, f4, c5, d5, e5, f5

*/

// Define moves

const anyMoves = bp.EventSet("anyMove", function (e) {
    return e.name.startsWith("Move")
})

const ESCenterCaptureMoves = bp.EventSet("EScenterCaptureMoves", function (e) {
    return e.name == 'Move' && (e.data.dst[1] == '3' || e.data.dst[1] == '4')
        && (e.data.src[0] == 'c' || e.data.src[0] == 'd' || e.data.src[0] == 'e' || e.data.src[0] == 'f' ||
            e.data.src[0] == 'b' || e.data.src[0] == 'g')
        && (e.data.dst[0] == 'c' || e.data.dst[0] == 'd' || e.data.dst[0] == 'e' || e.data.dst[0] == 'f')

})

const ESPawnDevelopingMoves = bp.EventSet("ESpawnDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.piece === "Pawn" &&
        (e.data.dst[1] == '3' || e.data.dst[1] == '4')
})

const ESKnightDevelopingMoves = bp.EventSet("ESKnightDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.piece === "Knight" &&
        (e.data.dst[1] == '2' || e.data.dst[1] == '3' || e.data.dst[1] == '4')
})

const ESBishopDevelopingMoves = bp.EventSet("ESBishopDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.piece == "Bishop" &&
        (e.data.dst[1] == '2' || e.data.dst[1] == '3' || e.data.dst[1] == '4'
            || e.data.dst[1] == '5')
})

const ESRookDevelopingMoves = bp.EventSet("ESRookDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.piece == "Rook" &&
        (e.data.dst[1] == '2' || e.data.dst[1] == '3')
})

const ESFianchettoMoves = bp.EventSet("ESfianchettoMoves", function (e) {
    return e.name == 'Move' && e.data.subtype == "Pawn" &&
        (e.data.dst[1] == '3' || e.data.dst[1] == '4') &&
        (e.data.dst[0] == 'b' || e.data.dst[0] == 'g')
})

let pawnMovesCounter = 0

// Game behavioral thread
bthread("Game thread", function (entity) {

    bp.store.put("Strategy Counter: Center strengthen moves", 0)
    bp.store.put("Strategy Counter: Fianchetto moves", 0)
    bp.store.put("Strategy Counter: Developing moves", 0)

    bp.store.put("Counter: Pawn moves", 0)
    bp.store.put("Counter: Bishop moves", 0)
    bp.store.put("Counter: Knight moves", 0)
    bp.store.put("Counter: Queen moves", 0)
    bp.store.put("Counter: Rook moves", 0)

    bp.store.put("Advisor: Center", 5)
    bp.store.put("Advisor: Develop", 3)
    bp.store.put("Advisor: Fianchetto", 1)

    bp.store.put("Piece Advisor: Pawn", 5)
    bp.store.put("Piece Advisor: Bishop", 3)
    bp.store.put("Piece Advisor: Knight", 3)
    bp.store.put("Piece Advisor: Queen", 1)
    bp.store.put("Piece Advisor: Rook", 0)

    while (true) {

        sync({request: bp.Event("Game Phase", "Opening")})
        bp.log.info("Context Changes - Opening Starts!!")
        sync({waitFor: AnyCastling}) // Stops Here
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

    // BENNY: BAD CODE
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
            let aval = availableDiagonalCellsFromPiece(bishopsArray[i], 7, allCells);
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
            let availKnightMoves = availableKnightMoves(knightsArray[i]);
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
            let availRookMoves = availableStraightCellsFromPiece(rooksArray[i], 7, allCells);
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

/*

ctx.bthread("DevelopingRooks", "Phase.Opening", function (entity) {

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
});
*/


ctx.bthread("CenterTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        sync({waitFor: ESCenterCaptureMoves})
        //([], [ESCenterCaptureMoves], []);
        let receivedCounter = bp.store.get("Advisor: Center")
        bp.store.put("Advisor: Center", receivedCounter - 0.5)
        receivedCounter = bp.store.get("Strategy Counter: Center strengthen moves")
        bp.store.put("Strategy Counter: Center strengthen moves", receivedCounter + 1)
    }
})

ctx.bthread("DevelopTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        sync({waitFor: [ESPawnDevelopingMoves, ESBishopDevelopingMoves]})
        //mySync([], [ESCenterCaptureMoves, ESBishopDevelopingMoves], []);
        let receivedCounter = bp.store.get("Advisor: Develop")
        bp.store.put("Advisor: Develop", receivedCounter - 0.75)
        receivedCounter = bp.store.get("Strategy Counter: Developing moves")
        bp.store.put("Strategy Counter: Developing moves", receivedCounter + 1)
    }
})

ctx.bthread("FianchettoTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        sync({waitFor: ESFianchettoMoves})
        //mySync([], [ESFianchettoMoves], []);
        let receivedCounter = bp.store.get("Advisor: Fianchetto")
        bp.store.put("Advisor: Fianchetto", receivedCounter - 0.2)
        receivedCounter = bp.store.get("Strategy Counter: Fianchetto moves")
        bp.store.put("Strategy Counter: Fianchetto moves", receivedCounter + 1)
    }
})

ctx.bthread("PawnMovesTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        //let e = mySync([], [anyMoves], []);
        if (e.data.piece == "Pawn") {
            let receivedAdvisor = bp.store.get("Piece Advisor: Pawn")
            bp.store.put("Piece Advisor: Pawn", receivedAdvisor - 1)
        }
    }
})

ctx.bthread("BishopMovesTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        //let e = mySync([], [anyMoves], []);
        if (e.data.piece == "Bishop") {
            let receivedAdvisor = bp.store.get("Piece Advisor: Bishop")
            bp.store.put("Piece Advisor: Bishop", receivedAdvisor - 1)
        }
    }
})

ctx.bthread("RookMovesTrackAndAdvice", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        //let e = mySync([], [anyMoves], []);
        if (e.data.piece == "Rook") {
            let receivedAdvisor = bp.store.get("Piece Advisor: Rook")
            bp.store.put("Piece Advisor: Rook", receivedAdvisor - 1)
        }
    }
})

/*
 Reasons for moves to be blocked:
 1. The move exposes the king ( causes a check )
 2. The desired move of the king is blocked due an opponent's piece "eyeing" the dst. cell
 3. Opponent's piece is "in the way"
 - Knight can't be blocked
 */

/* Those functions are responsible for finding unoccupied cells in a given distance.
* Those cells are potential destination cells of moves
*/

function availableStraightCellsFromPiece(piece, distance, allCells) {
    let col = piece.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (piece.cellId[1] - '0');
    //bp.log.info("Row -> " + row);
    //bp.log.info("Col -> " + col);

    let availableCells = [];
    let availableMoves = [];

    for (let i = 1; i <= distance; i++) {
        if (row + i <= 7 && row + i >= 0) {
            if (numericCellToCell(row + i, col, allCells).pieceId == undefined) {
                availableCells.push({row: row + distance, col: col});
                availableMoves.push(moveEvent("Rook", jToCol(col) + row, jToCol(col) + (row + i)));
            } else {
                return availableMoves
            }
        }
        if (row - i <= 7 && row - i > 0) {
            if (numericCellToCell(row - i, col, allCells).pieceId == undefined) {
                availableCells.push({row: row - distance, col: col});
                availableMoves.push(moveEvent("Rook", jToCol(col) + row, jToCol(col) + (row - i)));
            }
        }
        if (col + i <= 7 && col + i >= 0) {
            if (numericCellToCell(row, col + i, allCells).pieceId == undefined) {
                availableCells.push({row: row, col: col + distance});
                availableMoves.push(moveEvent("Rook", jToCol(col) + row, jToCol(col + i) + (row)));
            }
        }
        if (col - i <= 7 && col - i > 0) {
            if (numericCellToCell(row, col - i, allCells).pieceId == undefined) {
                availableCells.push({row: row, col: col - distance});
                availableMoves.push(moveEvent("Rook", jToCol(col) + row, jToCol(col - i) + (row)));
            }
        }

        //bp.log.info(availableCells)

    }
    return availableMoves
}

function availableStraightCellsFromPawn(pawn, distance, allCells) {

    let col = pawn.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (pawn.cellId[1] - '0');
    //bp.log.info ( "Row -> " + row);
    //bp.log.info ( "Col -> " + col);

    if (distance == 2 && row != 2) {
        return [];
    }

    let availableCells = [];
    let availableMoves = [];

    if (row + 1 <= 7 && row + 1 >= 0) {
        if (numericCellToCell(row + 1, col, allCells).pieceId == undefined) {
            availableCells.push({row: row + 1, col: col});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col) + (row + 1)));
        }
    }

    if (row + 2 <= 7 && row + 2 >= 0) {
        if (numericCellToCell(row + 2, col, allCells).pieceId == undefined) {
            availableCells.push({row: row + 2, col: col});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col) + (row + 2)));
        }
    }

    if (col + 1 <= 7 && col + 1 >= 0) {
        if (numericCellToCell(row + 1, col + 1, allCells).pieceId != undefined) {
            availableCells.push({row: row + 1, col: col + 1});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col + 1) + (row + 1)));
        }
    }

    if (col - 1 <= 7 && col - 1 >= 0) {
        if (numericCellToCell(row + 1, col - 1, allCells).pieceId != undefined) {
            availableCells.push({row: row + 1, col: col - 1});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col - 1) + (row + 1)));
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
    if (row + 1 <= 7 && row + 1 >= 0 && col + 2 <= 7 && col + 2 > 0) {
        if (numericCellToCell(row + 1, col + 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 2) + (row + 1)));
        }
    }
    if (row + 1 <= 7 && row + 1 >= 0 && col - 2 <= 7 && col - 2 > 0) {
        if (numericCellToCell(row + 1, col - 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 2) + (row + 1)));
        }
    }
    if (row - 1 <= 7 && (row - 1) > 0 && col + 2 <= 7 && col + 2 > 0) {
        if (numericCellToCell(row - 1, col + 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 2) + (row - 1)));
        }
    }
    if (row - 1 <= 7 && (row - 1) > 0 && col - 2 <= 7 && col - 2 > 0) {
        if (numericCellToCell(row - 1, col - 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 2) + (row - 1)));
        }
    }

    if (row + 2 <= 7 && row + 2 > 0 && col + 1 <= 7 && col + 1 > 0) {
        if (numericCellToCell(row + 2, col + 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 1) + (row + 2)));
        }
    }
    if (row - 2 <= 7 && (row - 2) > 0 && col + 1 <= 7 && col + 1 > 0) {
        if (numericCellToCell(row - 2, col + 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 1) + (row - 2)));
        }
    }
    if (row + 2 <= 7 && row + 2 > 0 && col - 1 <= 7 && col - 1 > 0) {
        if (numericCellToCell(row + 2, col - 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 1) + (row + 2)));
        }
    }
    if (row - 2 <= 7 && (row - 2) > 0 && col - 1 <= 7 && col - 1 > 0) {
        if (numericCellToCell(row - 2, col - 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 1) + (row - 2)));
        }
    }

    bp.log.info("Available Knight Moves Returned - " + availableMoves)

    return availableMoves

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

function numericCellToCell(i, j, allCells) {
    // bp.log.info ( "NumericCellToCell : " + j + ", " + i + ", allCells: " + allCells)
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

function availableDiagonalCellsFromPiece(piece, distance, allCells) {
    let col = piece.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (piece.cellId[1] - '0');
    let availableCells = [];
    let availableMoves = [];
    let color = piece.color; // use later for recognition of capturing opponent's pieces

    let checkMeNorthWest = true;
    let checkMeNorthEast = true;
    let checkMeSouthWest = true;
    let checkMeSouthEast = true;

    for (let i = 1; i <= distance; i++) {
        if (row + i <= 7 && row + i >= 0 && col + i <= 7 && col + i >= 0) {
            if (numericCellToCell(row + i, col + i, allCells).pieceId == undefined && checkMeNorthEast) {
                availableCells.push({row: row + i, col: col + i});
                availableMoves.push(moveEvent("Bishop", jToCol(col) + row, jToCol(col + i) + (row + i)));
            } else {
                checkMeNorthEast = false;
            }
        }
        if (row - i <= 7 && row - i >= 1 && col + i <= 7 && col + i >= 0) {
            if (numericCellToCell(row - i, col + i, allCells).pieceId == undefined && checkMeSouthEast) {
                availableCells.push({row: row - i, col: col + i});
                availableMoves.push(moveEvent("Bishop", jToCol(col) + row, jToCol(col + i) + (row - i)));
            } else {
                checkMeSouthEast = false;
            }
        }
        if (row + i <= 7 && row + i >= 0 && col - i <= 7 && col - i >= 1) {
            if (numericCellToCell(row + i, col - i, allCells).pieceId == undefined && checkMeNorthWest) {
                availableCells.push({row: row + i, col: col - i});
                availableMoves.push(moveEvent("Bishop", jToCol(col) + row, jToCol(col - i) + (row + i)));
            } else {
                checkMeNorthWest = false;
            }
        }
        if (row - i <= 7 && row - i >= 1 && col - i <= 7 && col - i >= 1) {
            if (numericCellToCell(row - i, col - i, allCells).pieceId == undefined && checkMeSouthWest) {
                availableCells.push({row: row - i, col: col - i});
                availableMoves.push(moveEvent("Bishop", jToCol(col) + row, jToCol(col - i) + (row - i)));
            } else {
                checkMeSouthWest = false;
            }
        }
    }

    return availableMoves

}

ctx.bthread("BoardTrack", "Phase.Opening", function (entity) {
    const board = [
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
        let move = mySync({waitFor: anyMoves});
        //let move = mySync([], [anyMoves], []);
        // bp.log.info(move)

        let srcRow = move.data.src[1] - '0';
        let srcCol = move.data.src[0].charCodeAt(0) - 'a'.charCodeAt(0);
        let dstRow = move.data.dst[1] - '0';
        let dstCol = move.data.dst[0].charCodeAt(0) - 'a'.charCodeAt(0);

        bp.log.info("srcRow => " + srcRow);
        bp.log.info("srcCol => " + srcCol);
        bp.log.info("dstRow => " + dstRow);
        bp.log.info("dstCol => " + dstCol);

        let tmpPiece = board[8 - srcRow][srcCol];

        board[8 - srcRow][srcCol] = '*';
        board[8 - dstRow][dstCol] = tmpPiece;

        if ((dstRow === 8 || dstRow === 1) && move.data.piece === "Pawn") // Queening
        {
            bp.log.info(move);
            // Todo: Add More Queening Options
            bp.log.info("Queening [Board]");
            board[Math.abs(dstRow - 8)][dstCol] = 'Q';
        }
        // print board

        for (var i = 0; i < 8; i++) {
            bp.log.info(ANSI_CYAN + board[i][0] + "  " + board[i][1] + "  " + board[i][2] + "  " + board[i][3] + "  " + board[i][4] +
                "  " + board[i][5] + "  " + board[i][6] + "  " + board[i][7] + ANSI_RESET);
        }
    }
});