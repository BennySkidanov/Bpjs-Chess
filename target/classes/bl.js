function mySync(stmt, syncData) {
    if (generationMode) {
        // bp.log.info("In mySync")
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
    return sync(stmt, syncData);
}

let ANSI_RESET = "\u001B[0m";
let ANSI_CYAN = "\u001B[36m";


/*let ANSI_BLACK = "\u001B[30m";
let ANSI_WHITE = "\u001B[37m";
let ANSI_RED = "\u001B[31m";
let ANSI_WHITE_BACKGROUND = "\u001B[47m";*/

// ctx.bthread("Interleave", "Phase.Opening", function (entity) {
//    while(true) {
//
//    }
// });

function startsWithCapital(word) {
    return word.charAt(0) === word.charAt(0).toUpperCase()
}

function canReachSquare(piece, dstCell) {
/*    bp.log.info("In canReachSquare")
    bp.log.info(piece.subtype)
    bp.log.info(piece.cellId)
    bp.log.info(dstCell)*/
    let colToTakePawn = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let rowToTakePawn = (dstCell[1] - '0');
    let allCells = ctx.runQuery("Cell.all")

  if (piece.subtype == "Pawn") {
    if (dstCell[0] == piece.cellId[0] && (Math.abs(dstCell[1] - piece.cellId[1]) == 2 || Math.abs(dstCell[1] - piece.cellId[1]) == 1)) {
      bp.log.info("Found!! ( pawn Advances )")
      return true;
    } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
        Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
        numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId != undefined) {
      bp.log.info("Found!! ( pawn Takes ) ")
      return true;
    }
    return false;
  } else if (piece.subtype == "Knight") {
    if (
        (Math.abs(dstCell[1] - piece.cellId[1]) == 2 || Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
        (Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 2 || Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1)
    ) {
      bp.log.info("Found!!")
      return true;
    }
    return false;
  } else if (piece.subtype == "Queen") {
    return true;
  }
  else if (piece.subtype == "Bishop") {
      if (
          Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0))
      ) {
          bp.log.info("Found!!")
          return true;
      }}

  else if (piece.subtype == "King") {
      if (Math.abs(dstCell[1] - piece.cellId[1]) <= 1 &&
          Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) <= 1)
          return true;
  }
  else if(piece.subtype == "Rook") {
      return true;
  }

  return false;

}

function handleShortCastle(color, pieces ) {
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
        let eventKing = moveEvent(king, king.cellId,"g1");
        bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId,"f1");
        bp.log.info(eventKing);
        sync({request: eventRook}, 100);
        // transaction
    }
    else {
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
        let eventKing = moveEvent(king, king.cellId,"g8");
        bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId,"f8");
        bp.log.info(eventKing);
        sync({request: eventRook}, 100);
    }
}


function findPieceThatCanReachToEndSquare(piecePrefix, dstCell, color) {
    /*bp.log.info("In findPieceThatCanReachToEndSquare")
    bp.log.info(piecePrefix)
    bp.log.info(dstCell)
    bp.log.info(color)*/
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
    bp.log.info('all pieces returned {0}', allPiecesOfType.length)
    // let allPiecesOfType = ctx.runQuery("Piece.White." + pieceType)
    //let allPiecesOfTypeValues = Array.from(allPiecesOfType);
    bp.log.info(allPiecesOfType)
    for (let i = 0; i < allPiecesOfType.length; i++) {
        if (optionalCol == '') {
            if (canReachSquare(allPiecesOfType[i], dstCell)) {
                // bp.log.info(allPiecesOfTypeValues[i]);
                return allPiecesOfType[i];
            }
        }
        else {
            bp.log.info("Checking piece that fits optional col!!" + optionalCol  + " " + allPiecesOfType[i].cellId.charAt(0));
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
    // bp.log.info(allMovesList)
    let player = '';
    let checkmate = false;
    for (let i = 0; i < allMovesList.length; i++) {
        (i % 2 === 0) ? player = 'White' : player = 'Black';
        let move = allMovesList[i]
        let pieces = ctx.runQuery("Piece." + player + ".All");
        bp.log.info("Next PGN Move = {0}", move)
        if (move.charAt(move.length - 1) == '+' || move.charAt(move.length - 1) == '#') {
            if (move.charAt(move.length - 1) == '#') checkmate = true;
            move = move.substr(0, move.length - 1)
        }
        bp.log.info("Next PGN Move (Again) = {0}", move)
        if (move.indexOf('x') > -1) {
          bp.log.info("Takes event!!")
          let piece = findPieceThatCanReachToEndSquare(
              startsWithCapital(move) ? move[0] : "P",
              move.substr(2),
              player);
          let event = moveEvent(piece.subtype, piece.cellId,move.substr(2));
          bp.log.info(event);
          if(!checkmate) {
              sync({request: event}, 100);
          }
          else {
              sync({request: event}, 100);
              sync({block: anyMoves}, 100);
          }
        }
        else if(move == "O-O" || move == "O-O-O")
        {
            bp.log.info("Castling event!!")
            if(move == "O-O") handleShortCastle(player, pieces);
            //else if (move == "O-O-O") handleLongCastle(player, pieces);
        }
        else {
          let piece = findPieceThatCanReachToEndSquare(
              startsWithCapital(move) ? move[0] : "P",
              startsWithCapital(move) ? move.substr(1) : move,
              player);
          // bp.log.info("REACHED SYNC")
          // bp.log.info("piece is {0}", piece)
          let event = moveEvent(piece.subtype, piece.cellId, startsWithCapital(move) ? move.length === 3 ? move.substr(1) : move.substr(2) : move);
          bp.log.info("The Move -- " + event);
          sync({request: event}, 100);
        }
    }


});

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
    return e.name == 'Move' && (e.data.dst[1] == '3' || e.data.dst[1] == '4')
})

const ESKnightDevelopingMoves = bp.EventSet("ESKnightDevelopingMoves", function (e) {
    return e.name == 'Move' && e.data.subtype == "Knight" &&
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
    bp.store.put("Counter: Rook moves", 0)

    bp.store.put("Advisor: Center", 5)
    bp.store.put("Advisor: Develop", 3)
    bp.store.put("Advisor: Fianchetto", 1)

    bp.store.put("Piece Advisor: Pawn", 3)
    bp.store.put("Piece Advisor: Bishop", 1)
    bp.store.put("Piece Advisor: Rook", 0)

    while (true) {

        sync({request: bp.Event("Game Phase", "Opening")})
        //bp.log.info("HERE!!")
        sync({waitFor: AnyCastling})
        sync({request: bp.Event("Game Phase", "Mid Game")})
        sync({request: bp.Event("Game Phase", "End Game")})

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

function clearDuplicates(pawnMoves) {
    let pawnMovesToRequest = []
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
    return pawnMovesToRequest
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

ctx.bthread("Strengthen", "Phase.Opening", function (entity) {

    while (true) {
        let pawnMoves = []
        let pawnsSet = ctx.runQuery(getSpecificType('Pawn', 'White'))
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        // let allCellsArr = Array.from(allCells);

        for (let i = 0; i < pawnsSet.length; i++) {
            let aval =  availableStraightCellsFromPawn(pawnsSet[i], 2, allCells);
            let aval2 = [];
            for (let j = 0; j < aval.length; j++) {
                if(ESCenterCaptureMoves.contains(aval[j])) {
                    aval2.push(aval[j]);
                }
            }
            pawnMoves = pawnMoves.concat(aval2);
        }

        let pawnMovesSet = clearDuplicates(pawnMoves)
        let pawnMovesToRequest = filterOccupiedCellsMoves(pawnMovesSet, cellsSet)


        // ACHIYA: why request and waitFor are the same? redundant and makes no sense I think you meant to wait for anyMove...
        //("mySync : Requesting center moves")
        bp.log.info("Strengthen : {0}" ,pawnMovesToRequest)
        mySync({request: pawnMovesToRequest, waitFor: anyMoves})
        // mySync(pawnMovesToRequest, pawnMovesToRequest, []);

        // let receivedCounter = bp.store.get("Strategy Counter: Center strengthen moves")
        // bp.store.put("Strategy Counter: Center strengthen moves", receivedCounter + 1)
    }
});

ctx.bthread("Fianchetto", "Phase.Opening", function (entity) {

    while (true) {

        let pawnMoves = []
        let pawnsSet = ctx.runQuery(getSpecificType('Pawn', 'White'))
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        //let allCellsArr = Array.from(allCells);

        for (let i = 0; i < pawnsSet.length; i++) {
            let aval =  availableStraightCellsFromPawn(pawnsSet[i], 2, allCells);
            let aval2 = [];
            for (let j = 0; j < aval.length; j++) {
                if(ESCenterCaptureMoves.contains(aval[j])) {
                    aval2.push(aval[j]);
                }
            }
            pawnMoves = pawnMoves.concat(aval2);
        }

        let pawnMovesSet = clearDuplicates(pawnMoves)
        let pawnMovesToRequest = filterOccupiedCellsMoves(pawnMovesSet, cellsSet)

        //bp.log.info("mySync : Requesting Fianchetto moves")
        // ACHIYA: why request and waitFor are the same? redundant and makes no sense I think you meant to wait for anyMove...
        bp.log.info("Fianchetto : {0}" , pawnMovesToRequest == null ? pawnMovesToRequest : "null" )
        mySync({request: pawnMovesToRequest, waitFor: anyMoves})
        // mySync(pawnMovesToRequest, pawnMovesToRequest, []);

        // let receivedCounter = bp.store.get("Strategy Counter: Fianchetto moves")
        // bp.store.put("Strategy Counter: Fianchetto moves", receivedCounter + 1)
    }
});

ctx.bthread("DevelopingPawns", "Phase.Opening", function (entity) {

    while (true) {

        let pawnMoves = []
        let pawnsSet = ctx.runQuery(getSpecificType('Pawn', 'White'))
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        //let allCellsArr = Array.from(allCells);

        for (let i = 0; i < pawnsSet.length; i++) {
            let aval =  availableStraightCellsFromPawn(pawnsSet[i], 2, allCells);
            let aval2 = [];
            for (let j = 0; j < aval.length; j++) {
                if(ESCenterCaptureMoves.contains(aval[j])) {
                    aval2.push(aval[j]);
                }
            }
            pawnMoves = pawnMoves.concat(aval2);
        }

        let pawnMovesSet = clearDuplicates(pawnMoves)
        let pawnMovesToRequest = filterOccupiedCellsMoves(pawnMovesSet, cellsSet)

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
                if(ESBishopDevelopingMoves.contains(aval[j])) {
                    aval2.push(aval[j]);
                }
            }
            bishopsMoves = bishopsMoves.concat(aval2);
        }

        let bishopsMovesSet = clearDuplicates(bishopsMoves)
        let bishopsMovesToRequest = filterOccupiedCellsMoves(bishopsMovesSet, cellsSet)

        //bp.log.info("mySync : Requesting bishop developing moves")
        // ACHIYA: why request and waitFor are the same? redundant and makes no sense I think you meant to wait for anyMove...
        mySync({request: bishopsMovesToRequest, waitFor: anyMoves})

        //let e = sync({request: bishopsMovesToRequest, waitFor: anyMoves})
        // //let e = mySync(bishopsMovesToRequest, bishopsMovesToRequest, []);
        // if (e.data.piece == "Bishop") {
        //     let receivedCounter = bp.store.get("Strategy Counter: Developing moves")
        //     bp.store.put("Strategy Counter: Developing moves", receivedCounter + 1)
        // }
        //
        // let receivedCounter = bp.store.get("Counter: Bishop moves")
        // bp.store.put("Counter: Bishop moves", receivedCounter + 1)

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
            let avlble = availableStraightCellsFromPiece(rook, 7, allCellsArr)
            RooksMoves = RooksMoves.concat(avlble
                .filter(function (m) {
                    return ESRookDevelopingMoves.contains(m);
                })
            )
        }

        let RooksMovesSet = clearDuplicates(RooksMoves)
        let RooksMovesToRequest = filterOccupiedCellsMoves(RooksMovesSet, cellsSet)

        //bp.log.info("mySync : Requesting rooks developing moves")
        // ACHIYA: why request and waitFor are the same? redundant and makes no sense I think you meant to wait for anyMove...
        mySync({request: RooksMovesToRequest, waitFor: anyMoves})

        //let e = sync({request: RooksMovesToRequest, waitFor: anyMoves})
        // let e = mySync(RooksMovesToRequest, anyMoves, []);
        // if (e.data.piece == "Rook") {
        //     let receivedCounter = bp.store.get("Strategy Counter: Developing moves")
        //     bp.store.put("Strategy Counter: Developing moves", receivedCounter + 1)
        // }
        //
        // let receivedCounter = bp.store.get("Counter: Rook moves")
        // bp.store.put("Counter: Rook moves", receivedCounter + 1)
    }
});
*/
/* bp.store.put("Strategy Counter: Center strengthen moves", 0)
    bp.store.put("Strategy Counter: Fianchetto moves", 0)
    bp.store.put("Strategy Counter: Developing moves", 0) */

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
        bp.store.put("Advisor: Fianchetto", receivedCounter - 0.2 )
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
        if (row - i <= 7 && row - i >= 0) {
            if (numericCellToCell(row - i, col).pieceId == undefined) {
                availableCells.push({row: row - distance, col: col});
                availableMoves.push(moveEvent("Rook", jToCol(col) + row, jToCol(col) + (row - i)));
            }
        }
        if (col + i <= 7 && col + i >= 0) {
            if (numericCellToCell(row, col + i).pieceId == undefined) {
                availableCells.push({row: row, col: col + distance});
                availableMoves.push(moveEvent("Rook", jToCol(col) + row, jToCol(col + i) + (row)));
            }
        }
        if (col - i <= 7 && col - i >= 0) {
            if (numericCellToCell(row, col - i).pieceId == undefined) {
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

    if(col + 1 <= 7 && col + 1 >= 0) {
        if (numericCellToCell(row + 1, col + 1, allCells).pieceId != undefined) {
            availableCells.push({row: row + 1, col: col + 1});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col + 1) + (row + 1)));
        }
    }

    if(col - 1 <= 7 && col - 1 >= 0) {
        if (numericCellToCell(row + 1, col - 1, allCells).pieceId != undefined) {
            availableCells.push({row: row + 1, col: col - 1});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col - 1) + (row + 1)));
        }
    }

    return availableMoves
}

function availableKnightMoves(knight) {
    let col = knight.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (knight.cellId[1] - '0');
    let availableMoves = []
    if (row + 1 <= 7 && row + 1 >= 0 && col + 2 <= 7 && col + 2 <= 0) {
        if (numericCellToCell(row + 1, col + 2).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 2) + (row + 1)));
        }
    }
    if (row + 1 <= 7 && row + 1 >= 0 && col - 2 <= 7 && col - 2 <= 0) {
        if (numericCellToCell(row + 1, col - 2).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 2) + (row + 1)));
        }
    }
    if (row - 1 <= 7 && row - 1 >= 0 && col + 2 <= 7 && col + 2 <= 0) {
        if (numericCellToCell(row - 1, col + 2).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 2) + (row - 1)));
        }
    }
    if (row - 1 <= 7 && row - 1 >= 0 && col - 2 <= 7 && col - 2 <= 0) {
        if (numericCellToCell(row - 1, col - 2).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 2) + (row - 1)));
        }
    }

    if (row + 2 <= 7 && row + 2 >= 0 && col + 1 <= 7 && col + 1 <= 0) {
        if (numericCellToCell(row + 2, col + 1).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 1) + (row + 2)));
        }
    }
    if (row - 2 <= 7 && row - 2 >= 0 && col + 1 <= 7 && col + 1 <= 0) {
        if (numericCellToCell(row - 2, col + 1).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 1) + (row - 2)));
        }
    }
    if (row + 2 <= 7 && row + 2 >= 0 && col - 1 <= 7 && col - 1 <= 0) {
        if (numericCellToCell(row + 2, col - 1).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 1) + (row + 2)));
        }
    }
    if (row - 2 <= 7 && row - 2 >= 0 && col - 1 <= 7 && col - 1 <= 0) {
        if (numericCellToCell(row - 2, col - 1).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 1) + (row - 2)));
        }
    }

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
    for (let i = 0; i < allCells.length; i++) {
        let cell = allCells[i]
        if (cell.id == requestedID)
            return cell;
    }
    // bp.log.info(requestedID)
    return null;
}

function numericCellToCell(i, j, allCells) {
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
    // bp.log.info ( j_char + i )
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
            }
            else { checkMeSouthEast = false; }
        }
        if (row + i <= 7 && row + i >= 0 && col - i <= 7 && col - i >= 0) {
            if (numericCellToCell(row + i, col - i, allCells).pieceId == undefined && checkMeNorthWest) {
                availableCells.push({row: row + i, col: col - i});
                availableMoves.push(moveEvent("Bishop", jToCol(col) + row, jToCol(col - i) + (row + i)));
            } else {
                checkMeNorthWest = false;
            }
        }
        if (row - i <= 7 && row - i >= 1 && col - i <= 7 && col - i >= 0) {
            if (numericCellToCell(row - i, col - i, allCells).pieceId == undefined && checkMeSouthWest) {
                availableCells.push({row: row - i, col: col - i});
                availableMoves.push(moveEvent("Bishop", jToCol(col) + row, jToCol(col - i) + (row - i)));
            }
            else { checkMeSouthWest = false; }
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
        bp.log.info(move)

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

        // print board

        for (var i = 0; i < 8; i++) {
            bp.log.info(ANSI_CYAN + board[i][0] + "  " + board[i][1] + "  " + board[i][2] + "  " + board[i][3] + "  " + board[i][4] +
                "  " + board[i][5] + "  " + board[i][6] + "  " + board[i][7] + ANSI_RESET );
        }
    }
});