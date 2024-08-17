function mySync(stmt, syncData) {
    // // bp.log.info("Sync Data " + JSON.stringify(syncData))
    if (generationMode) {
        // bp.log.info("In mySync, stmt = " + stmt + ", syncData = " + syncData)
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

const ANSI_RESET = "\u001B[0m";
const ANSI_PURPLE = "\u001B[35m";
const ANSI_CYAN = "\u001B[36m";


/*
 * Chess Piece Values - taken from https://www.chess.com/terms/chess-piece-value
 * Each chess piece has a different value.
 * It should come as no surprise that the piece's values are directly tied to a piece's so-called strength.
 * A pawn is worth one point, a knight or bishop is worth three points, a rook is five points, and a queen is nine points.
 * The king is the only piece that doesn't have a point value.
 * This is because the king cannot be captured (an attacked king is in check), and checkmating the king is the true goal of any chess game.
*/

const KING_VALUE = -1;

const piecesValues = {
    "Pawn": 1,
    "Bishop": 3,
    "Knight": 3,
    "Rook": 5,
    "Queen": 9,
    "King": KING_VALUE
};

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
               Queening -> e8=Q, dxc8=Q
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

    5. En Passant:
    The en passant rule is a special pawn-capturing move in chess. "En passant" is a French expression that translates to "in passing."
    Pawns can usually capture only pieces directly and diagonally in front of them on an adjacent file. It moves to the captured piece's square and replaces it.
    With en passant, though, things are a little different. This type of capture is the only one in chess where the capturing piece doesn't land on the same square as its victim.
    To perform this capture, you must take your opponent's pawn as if it had moved just one square. You move your pawn diagonally to an adjacent square, one rank farther from where it had been,
    on the same file where the enemy's pawn is, remove the opponent's pawn from the board.
    There are a few requirements for the move to be legal:
        - The capturing pawn must have advanced three ranks to perform this move.
        - The captured pawn must have moved two squares in one move, landing right next to the capturing pawn.
        - The en passant capture must be performed immediately after the pawn being captured moves. If the player misses this opportunity, they cannot perform it later.
        - This type of capture cannot happen if the capturing pawn has already advanced four or more squares. Another instance where this capture is not allowed is when the enemy pawn lands right next to your pawn only after making two moves.

    6. Pawn Promotion:
    Pawn promotion occurs when a pawn reaches the farthest rank from its original square - the eighth rank for White and the first rank for Black.
    When this happens, the player can replace the pawn with a queen, a rook, a bishop, or a knight.
    Players often promote a pawn to a queen, popularly known as "queening the pawn".
    After one player promotes a pawn, the other player must move (unless they are checkmated).
*/

const TAKES = 'x';
const QUEENING = '=';
const FREE_PIECE = 2;
const WORTHWHILE_TRADE = 1;
const EQUAL_TRADE = 0;
const UNWORTHY_TRADE = -1;

/* Strategies in the opening:
    1. Developing pieces
    2. Strengthening the center squares
    3. Fianchetto
    What is the probability of each of the strategies to be executed given a certain move \ situation ?
 */


const allMovesList = (function () {
    let moves = pgn.split(" ");

    // bp.log.info("~~ LOG (58) ~~ Moves after splitting : " + moves)

    let allMovesList = [];

    for (let i = 0; i < moves.length; i++) {
        if (i % 3 !== 0) {
            // Every 3rd value in the string is the move number, therefore should be omitted
            allMovesList.push(moves[i]);
        }
    }

    // Debugging Purposes

    let whiteMoves = [];
    let blackMoves = [];
    for (let i = 0; i < allMovesList.length; i += 2) {
        whiteMoves.push(allMovesList[i]);
        blackMoves.push(allMovesList[i + 1]);
    }

    // bp.log.info("~~ LOG (78) ~~ White Moves : " + whiteMoves)
    // bp.log.info("~~ LOG (79) ~~ Black Moves : " + blackMoves)

    return allMovesList
})()

const AnyCastling = bp.EventSet("AnyCastling", function (e) {
    return false
})

const anyMoves = bp.EventSet("anyMove", function (e) {
    return e.name.startsWith("Move")
})

const ESCenterCaptureMoves = bp.EventSet("EScenterCaptureMoves", function (e) {
    return e.name == 'Move' &&
        e.data.color == "White" &&
        (e.data.dst[1] == '3' || e.data.dst[1] == '4')
        && (e.data.src[0] == 'c' || e.data.src[0] == 'd' || e.data.src[0] == 'e' || e.data.src[0] == 'f' || e.data.src[0] == 'b' || e.data.src[0] == 'g')
        && (e.data.dst[0] == 'c' || e.data.dst[0] == 'd' || e.data.dst[0] == 'e' || e.data.dst[0] == 'f')

})

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
    // // bp.log.info("noPiecesInBetween : " + srcCell + " => " + dstCell)
    let nonOccupiedCellsSet = ctx.runQuery("Cell.all.nonOccupied")
    // // bp.log.info(nonOccupiedCellsSet)
    let nonOccupiedCellsIds = []
    for (let cellIndex = 0; cellIndex < nonOccupiedCellsSet.length; cellIndex++) {
        // //bp.log.info(nonOccupiedCellsSet[cellIndex].id)
        nonOccupiedCellsIds.push(nonOccupiedCellsSet[cellIndex].id)
    }
    if (srcCell[0].charCodeAt(0) === dstCell[0].charCodeAt(0)) // Same Column
    {
        // // bp.log.info("Same Column")
        // Run through rows indexes
        if (srcCell[1] > dstCell[1]) {
            // // bp.log.info("Same Column (option 1)")
            for (let rowIndex = String.fromCharCode(dstCell[1].charCodeAt(0) + 1); rowIndex < srcCell[1]; rowIndex = getNextChar(rowIndex)) {
                // // bp.log.info("noPiecesInBetween : Inspecting " + (srcCell[0] + rowIndex))
                if (!(nonOccupiedCellsIds.includes(srcCell[0] + rowIndex)))
                    return false;
            }
        } else {
            // // bp.log.info("Same Column (option 2)")
            for (let rowIndex = String.fromCharCode(srcCell[1].charCodeAt(0) + 1); rowIndex < dstCell[1]; rowIndex = getNextChar(rowIndex)) {
                // // bp.log.info("noPiecesInBetween : Inspecting " + (srcCell[0] + rowIndex))
                if (!(nonOccupiedCellsIds.includes(srcCell[0] + rowIndex)))
                    return false;
            }
        }
    } else if (srcCell[1] === dstCell[1]) // Same Row
    {
        // // bp.log.info("Same Row")
        // Run through rows indexes
        if (srcCell[0] > dstCell[0]) {
            // // bp.log.info("Same Row (option 1)")

            for (let colIndex = String.fromCharCode(dstCell[0].charCodeAt(0) + 1); colIndex < srcCell[0]; colIndex = getNextChar(colIndex)) {
                // // bp.log.info("noPiecesInBetween : Inspecting " + colIndex + srcCell[1])
                if (!(nonOccupiedCellsIds.includes(colIndex + srcCell[1]))) {
                    // // bp.log.info("noPiecesInBetween, Returning False");
                    return false;
                }
            }
        } else {
            // // bp.log.info("Same Row (option 2)")
            // // bp.log.info("noPiecesInBetween : need to inspect every column between " + String.fromCharCode(srcCell[0].charCodeAt(0) + 1) + " -> " + dstCell[0])
            // let checkvar = (String.fromCharCode(srcCell[0].charCodeAt(0) + 1))
            // checkvar = getNextChar(checkvar)
            // // bp.log.info("noPiecesInBetween : Check -> " + checkvar)
            for (let colIndex = String.fromCharCode(srcCell[0].charCodeAt(0) + 1); colIndex < dstCell[0]; colIndex = getNextChar(colIndex)) {
                // // bp.log.info("noPiecesInBetween : Inspecting " + colIndex + srcCell[1])
                if (!(nonOccupiedCellsIds.includes(colIndex + srcCell[1]))) {
                    // // bp.log.info("noPiecesInBetween, Returning False");
                    return false;
                } else {
                    // // bp.log.info("Continue...")
                    continue;
                }
            }
        }
    } else {
        return false
    }
    // // bp.log.info("noPiecesInBetween, Returning True");
    return true;

}

function noPiecesInBetweenDiagonal(piece, dstCell) {
    // bp.log.info("noPiecesInBetweenDiagonal => " + piece.cellId + " To => " + dstCell)
    let allCells = ctx.runQuery("Cell.all");
    let reachableCells = availableDiagonalCellsFromPiece(piece, 8, allCells)[1];

    for (let i = 0; i < reachableCells.length; i++) {
        // // bp.log.info("noPiecesInBetweenDiagonal")
        // // bp.log.info(reachableCells[i].id)

        if (reachableCells[i].id === dstCell ||
            Math.abs(dstCell[1] - reachableCells[i].id[1]) === Math.abs(dstCell[0].charCodeAt(0) - reachableCells[i].id [0].charCodeAt(0)))
            return true;
    }

    return false;
}

function canReachSquareTrading(piece, dstCell, takes, enPassant) {
    // // bp.log.info("~~ LOG (354) canReachSquareTrading, piece = " + JSON.stringify(piece) + ", dstCell = " + dstCell)
    // /* bp.log.info("In canReachSquare Trading, dstCell = " + dstCell)
    //  bp.log.info("enPassant = " + enPassant + ", takes = " + takes)
    //  bp.log.info(piece.subtype)
    //  bp.log.info(piece.cellId)
    //  bp.log.info(dstCell)*/
    let colToTakePawn = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let rowToTakePawn = (dstCell[1] - '0');
    let allCells = ctx.runQuery("Cell.all")
    // // bp.log.info(allCells)
    if (piece.subtype === "Pawn") {
        if (dstCell[0] === piece.cellId[0] &&
            (Math.abs(dstCell[1] - piece.cellId[1]) === 2 || Math.abs(dstCell[1] - piece.cellId[1]) === 1)
            && !takes) {
            // // bp.log.info("Found!! ( pawn Advances )")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId != undefined && takes) {
            // // bp.log.info("Found!! ( pawn Takes ) ")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId == undefined && enPassant) {

            // // bp.log.info("Found!! ( pawn Takes En passant ) ")
            return true;
        }
        // return true;*/
        return false;
    } else if (piece.subtype == "Knight") {
        if (
            (Math.abs(dstCell[1] - piece.cellId[1]) === 2 && Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 1) ||
            (Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 2 && Math.abs(dstCell[1] - piece.cellId[1]) === 1)
        ) {
            // // bp.log.info("Found!!")
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
            // // bp.log.info("Found!!")
            return true;
        }
        return false;
    } else if (piece.subtype === "Bishop") {
        if (
            Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0))
            &&
            noPiecesInBetweenDiagonal(piece, dstCell)
        ) {
            // // bp.log.info("Found!!")
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
            // // bp.log.info("Found Rook Move!!")
            return true;
        }
    }

    return false;

}

function canReachSquare(piece, dstCell, takes, enPassant) {
    // // bp.log.info("~~ LOG (367) ~~ In canReachSquare, piece = " + JSON.stringify(piece) + ", dstCell = " + dstCell + ", enPassant = " + enPassant + ", takes = " + takes)
    // // bp.log.info(piece.subtype)
    // // bp.log.info(piece.cellId)
    // // bp.log.info(dstCell)
    let colToTakePawn = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    let rowToTakePawn = (dstCell[1] - '0');
    let allCells = ctx.runQuery("Cell.all")
    // // bp.log.info(allCells)
    if (piece.subtype == "Pawn") {
        if (dstCell[0] == piece.cellId[0] &&
            (Math.abs(dstCell[1] - piece.cellId[1]) == 2 || Math.abs(dstCell[1] - piece.cellId[1]) == 1)
            && !takes) {
            // // bp.log.info("Found!! ( pawn Advances )")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) && Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId != undefined && takes) {
            // // bp.log.info("Found!! ( pawn Takes ) ")
            return true;
        } else if ((Math.abs(dstCell[1] - piece.cellId[1]) == 1) &&
            Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) == 1 &&
            numericCellToCell(rowToTakePawn, colToTakePawn, allCells).pieceId == undefined && enPassant) {

            // // bp.log.info("Found!! ( pawn Takes En passant ) ")
            return true;
        }
        // return true;*/
        return false;
    } else if (piece.subtype == "Knight") {
        if (
            (Math.abs(dstCell[1] - piece.cellId[1]) === 2 && Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 1) ||
            (Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 2 && Math.abs(dstCell[1] - piece.cellId[1]) === 1)
        ) {
            // // bp.log.info("Found!!")
            return true;
        }
        return false;
    } else if (piece.subtype == "Queen") {
        if (
            Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) ||
            ((dstCell[1] - piece.cellId[1]) === 0 || (dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0)) === 0)
        ) {
            // // bp.log.info("Found!!")
            return true;
        }
        return false;
    } else if (piece.subtype == "Bishop") {
        if (
            Math.abs(dstCell[1] - piece.cellId[1]) === Math.abs(dstCell[0].charCodeAt(0) - piece.cellId[0].charCodeAt(0))
        ) {
            // // bp.log.info("Found!!")
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
            // // bp.log.info("Found Rook Move!!")
            return true;
        }
    }

    return false;

}

function handleShortCastle(color, pieces) {
    // // bp.log.info("~~ handleShortCastle ~~ " + color)
    //let piecesValues = Array.from(pieces);
    if (color == "White") {
        let king, rook;
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                // // bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "h1") {
                rook = pieces[i];
                // // bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "g1", color);
        // // bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "f1", color);
        // // bp.log.info(eventKing);
        sync({request: eventRook}, 100);
        // transaction
    } else {
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                // // bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "h8") {
                rook = pieces[i];
                // // bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "g8", "Black");
        // // bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "f8", "Black");
        // // bp.log.info(eventKing);
        sync({request: eventRook}, 100);
    }
}

function handleLongCastle(color, pieces) {
    // // bp.log.info("~~ handleLongCastle ~~ " + color)

    if (color == "White") {
        let king, rook;
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                // // bp.log.info("~~ handleLongCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "a1") {
                rook = pieces[i];
                // // bp.log.info("~~ handleLongCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "c1", color);
        // // bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "d1", color);
        // // bp.log.info(eventKing);
        sync({request: eventRook}, 100);
        // transaction
    } else {
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].subtype == "King") {
                king = pieces[i];
                // // bp.log.info("~~ handleShortCastle ~~ Found King");
                continue;
            } else if (pieces[i].subtype == "Rook" && pieces[i].cellId == "a8") {
                rook = pieces[i];
                // // bp.log.info("~~ handleShortCastle ~~ Found Rook");
                continue;
            }
        }
        // transaction
        let eventKing = moveEvent(king, king.cellId, "c8", "Black");
        // // bp.log.info(eventKing);
        sync({request: eventKing}, 100);
        let eventRook = moveEvent(rook, rook.cellId, "d8", "Black");
        // // bp.log.info(eventKing);
        sync({request: eventRook}, 100);
    }
}

function findPieceThatCanReachToEndSquare(piecePrefix, dstCell, color, takes, enPassant, enPassantPieceCellId) {


    // // bp.log.info("~~ LOG (536) ~~ findPieceThatCanReachToEndSquare with the following params : " + "piecePrefix = " + piecePrefix + " dst cell = " + dstCell)
    // // bp.log.info("~~ LOG (537) ~~ findPieceThatCanReachToEndSquare Other params : Color = " + color + " Takes = " + takes + " enPassant = " + enPassant)


    let optionalCol = "";
    if (dstCell.length === 3) // Optional column appears
    {
        optionalCol = dstCell.charAt(0);
        dstCell = dstCell.substr(1);
        // // bp.log.info("optionalCol " + optionalCol)
        // // bp.log.info("dst cell " + dstCell)
    }
    let pieceType = piecesPrefixes[piecePrefix];
    // // bp.log.info("~~ LOG (548) ~~ piece type = " + pieceType)
    let allPiecesOfType = ctx.runQuery(getSpecificType(pieceType, color))
    // // bp.log.info("~~ LOG (550) ~~ There are " + allPiecesOfType.length + " candidates ")
    for (let i = 0; i < allPiecesOfType.length; i++) {
        if (optionalCol === "") {
            // // bp.log.info("~~ LOG (554) ~~ No optional column! looking at " + JSON.stringify(allPiecesOfType[i]))
            // Todo : change here, not all calls with enPassant = True
            if (enPassant && allPiecesOfType[i].cellId === enPassantPieceCellId) {
                if (canReachSquare(allPiecesOfType[i], dstCell, takes, enPassant)) {
                    // // bp.log.info(allPiecesOfTypeValues[i]);
                    return allPiecesOfType[i];
                }
            } else if (canReachSquare(allPiecesOfType[i], dstCell, takes, false)) {
                return allPiecesOfType[i];
            }
        } else {
            // // bp.log.info("Checking piece that fits optional col!!" + optionalCol + " " + allPiecesOfType[i].cellId.charAt(0));
            if (allPiecesOfType[i].cellId.charAt(0) == optionalCol) {
                if (canReachSquare(allPiecesOfType[i], dstCell)) {
                    // // bp.log.info(allPiecesOfTypeValues[i]);
                    // // bp.log.info("IN Checking piece that fits optional col!!");
                    return allPiecesOfType[i];
                }
            }
        }
    }
}

/*
A piece exchange (or piece trade) happens in chess when players capture each other's pieces in a series of related moves.
Those moves do not need to be one right after the other, but there must be a connection between the captures.
Not all piece exchanges are created equal. When considering solely the strength of each traded piece, we can define them as one of two kinds:
1. Even Exchanges
    Even exchanges occur when the total piece value of both sides of the trade is equal. The pieces do not have to be the same as long as the final material count is equivalent for both players.
    The material count of the captured pieces is the same.
    Some examples of exchanges are:
        - Any trade of the same pieces, such as a rook for another rook, a pawn for another pawn, and so on;
        - A bishop for a knight (3 points each);
        - A knight and two pawns for a rook (5 points each);
2. Uneven Exchanges
    Uneven exchanges happen when the final material count for each side's captured pieces differs.
    The player who gained material then "wins the exchange" or is "up the exchange."
    The player who lost material, on the other hand, "loses the exchange" or is considered to be "down the exchange."
*/

ctx.bthread("ParsePGNAndSimulateGame", "Phase.Opening", function (entity) {

    let player = '';
    let checkmate = false;
    let enPassant = false;
    // bp.log.info("allMovesList => " + allMovesList)
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
        // bp.log.info("~~ LOG ~~ Next PGN Move = {0}", move)

        // Game Tactics + Flags Update

        if (move.charAt(move.length - 1) == '+' || move.charAt(move.length - 1) == '#') { // Special Handling: Check & Checkmate
            // bp.log.info("~~ LOG ~~ Special Handling")
            if (move.charAt(move.length - 1) == '#') {
                // bp.log.info("~~ LOG ~~ Checkmate")
                checkmate = true;
                //bp.store.put("General Tactics: Checkmate", 1)
            } else if (move.charAt(move.length - 1) == '+') {
                // bp.log.info("~~ LOG ~~ Check")
                // bp.store.put("General Tactics: Check", 1)
            }
            move = move.substr(0, move.length - 1)
        }

        // if (move.indexOf(TAKES) > -1 && i % 2 === 0) {
        // //     bp.log.info("UPDATING GENERAL TACTICS")
        //     let returnValuesList = TradingGameTacticCheck(move, player)
        //     bp.store.put("General Tactics: Take Free Piece", returnValuesList[0])
        //     bp.store.put("General Tactics: Equal Trade", returnValuesList[1])
        //     bp.store.put("General Tactics: Worthwhile Trade", returnValuesList[2])
        //     bp.store.put("General Tactics: Worthless Trade", returnValuesList[3])
        // }


        // // bp.log.info("Next PGN Move (Again) = {0}", move)
        if (move.indexOf(TAKES) > -1 && (move.indexOf(QUEENING) > -1)) {
            // // bp.log.info("~~ LOG ~~ Takes & Queen event!!")
            let piece = findPieceThatCanReachToEndSquare(startsWithCapital(move) ? move[0] : "P",
                move.substr(move.indexOf(TAKES) + 1, 2),
                player, true, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr(move.indexOf(TAKES) + 1, 2), piece.color, true);
            // // bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                // // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                // // bp.log.info("Checkmate")
                // // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        } else if (move.indexOf(TAKES) > -1) {
            // // bp.log.info("~~ LOG (790) ~~ This move is Takes event");
            // Todo: for now, handle enpassant only for white, add handling for black as well if needed
            if (allMovesList[i][(allMovesList[i].indexOf('x')) + 1] === allMovesList[i - 1][0] &&
                allMovesList[i - 1].charAt(1) === '5' &&
                !(allMovesList.includes(allMovesList[i - 1][0] + '6'))) {
                // bp.log.info("~~ LOG (795) ~~ This move is classified En passant!! " + move + "," + allMovesList[i])
                enPassant = true;
            }

            let piece = findPieceThatCanReachToEndSquare(startsWithCapital(move) ? move[0] : "P", move.substr((move.indexOf('x') + 1)), player, true, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            // bp.log.info("~~ LOG (800) ~~ piece is " + JSON.stringify(piece))
            pieceExchange(piece, move.substr((move.indexOf('x') + 1)));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr((move.indexOf('x') + 1)), piece.color, true);

            // // bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                // // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                // // bp.log.info("Checkmate")
                // // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        } else if (move == "O-O" || move == "O-O-O") {
            // bp.log.info("Castling event!!")
            if (move == "O-O") handleShortCastle(player, pieces);
            else if (move == "O-O-O") handleLongCastle(player, pieces);
        } else if ((move.indexOf('=') > -1)) {
            // // bp.log.info("Queening event");
            let piece = findPieceThatCanReachToEndSquare(
                startsWithCapital(move) ? move[0] : "P",
                move.substr(0, 2),
                player, false, enPassant, allMovesList[i].charAt(0).concat(player === 'White' ? "5" : "4"));
            let event = moveEvent(piece.subtype, piece.cellId, move.substr(0, 2), piece.color);
            // // bp.log.info("Found Corresponding Event => \t " + event);
            if (!checkmate) {
                // // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                // // bp.log.info("Checkmate")
                // // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        } else {
            // bp.log.info("~~ LOG (773) ~~ " + move)
            let piece = findPieceThatCanReachToEndSquare(
                startsWithCapital(move) ? move[0] : "P",
                startsWithCapital(move) ? move.substr(1) : move,
                player, false, false);
            // // bp.log.info("REACHED SYNC")
            // // bp.log.info("~~ LOG (768) ~~ Piece -> " + JSON.stringify(piece))
            let event = moveEvent(piece.subtype, piece.cellId,
                startsWithCapital(move) ? move.length === 3 ? move.substr(1) : move.substr(2) : move, piece.color);
            // // bp.log.info("The Move -- " + event);
            if (!checkmate) {
                // // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
            } else {
                // // bp.log.info("Checkmate")
                // // bp.log.info("The Move -- " + event)
                sync({request: event}, 100);
                sync({block: anyMoves}, 100);
            }
        }
    }


    // bp.log.info("~~ LOG (788) ~~ Finished Parsing Game!!")
    sync({block: anyMoves}, 100);
})


// Game behavioral thread
bthread("Game thread", function (entity) {

    // Todo: Fill in number of features
    // Total - [X] features

    // General Tactics
    // bp.store.put("General Tactics: Check", 0)
    // bp.store.put("General Tactics: Checkmate", 0)
    // bp.store.put("General Tactics: Take Free Piece", 0)
    // bp.store.put("General Tactics: Equal Trade", 0)
    // bp.store.put("General Tactics: Worthwhile Trade", 0)
    // bp.store.put("General Tactics: Worthless Trade", 0)


    // Optional "Rainy Day" Feature, Not Used
    bp.store.put("Developing the queen too early", 0)

    // Strategy Counter features
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
    bp.store.put("Moves Counter: Pinning", 0)
    bp.store.put("Moves Counter: Preventing b4, g4 Attacks", 0)

    bp.store.put("Piece Exchange", 0)
    /*
        bp.store.put("Piece Exchange Feature: Even Exchange", 0)
        bp.store.put("Trading Feature: Worthwhile Exchange", 0)
        bp.store.put("Trading Feature: Unworthy Exchange", 0)
    */

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


    // Track The game
    while (true) {

        sync({request: bp.Event("Game Phase", "Opening")})
        // bp.log.info("~~ LOG ~~ Context Changed - Opening Starts!!")
        sync({waitFor: AnyCastling})
        // sync({request: bp.Event("Game Phase", "Mid Game")})
        // sync({request: bp.Event("Game Phase", "End Game")})

        /*mySync([bp.Event("Game Phase" , "Opening")], [], []);
        mySync([], [AnyCastling], []);
        mySync([bp.Event("Game Phase" , "Mid Game")], [], []);
        mySync([bp.Event("Game Phase" , "End Game")], [], []);*/
    }
});


function clearDuplicates(moves) {
    let arr = []
    new Set(moves).forEach(e => arr.push(e))
    return arr
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
        // bp.log.info("Strengthen : {0}", pawnMovesToRequest)
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

        // //bp.log.info("mySync : Requesting Fianchetto moves")
        // ACHIYA: why request and waitFor are the same? redundant and makes no sense I think you meant to wait for anyMove...
        // bp.log.info("Fianchetto : {0}", pawnMovesToRequest == null ? pawnMovesToRequest : "null")
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

        // //bp.log.info("the object is {0}", pawnMovesSet)

        pawnsSet = cellsSet = allCells = pawnMoves = pawnMovesSet = null;


        //("mySync : Requesting pawn developing moves")
        mySync({request: pawnMovesToRequest, waitFor: anyMoves})
        // mySync(pawnMovesToRequest, pawnMovesToRequest, []);

        // let receivedCounter = bp.store.get("Strategy Counter: Developing moves")
        // bp.store.put("Strategy Counter: Developing moves", receivedCounter + 1)
    }
});

/*ctx.bthread("DevelopingBishops", "Phase.Opening", function (entity) {

    while (true) {

        let bishopsMoves = []
        let bishopsArray = ctx.runQuery(getSpecificType('Bishop', 'White'))
        // let bishopsSet = ctx.runQuery("Piece.White.Bishop")
        let cellsSet = ctx.runQuery("Cell.all.nonOccupied")
        let allCells = ctx.runQuery("Cell.all")
        //let allCellsArr = Array.from(allCells);

        for (let i = 0; i < bishopsArray.length; i++) {
            // bp.log.info("Calling");
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
        // //bp.log.info("mySync : Requesting bishop developing moves")
        mySync({request: bishopsMovesToRequest, waitFor: anyMoves})

    }
});*/

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

        // // bp.log.info("knight moves length " + knightMoves.length)
        let knightsMovesSet = clearDuplicates(knightMoves)
        let knightsMovesToRequest = filterOccupiedCellsMoves(knightsMovesSet, nonOccupiedCellsSet)
        nonOccupiedCellsSet = knightsArray = knightMoves = knightsMovesSet = null;
        // bp.log.info("mySync : Requesting knights developing moves " + knightsMovesToRequest)

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

        // bp.log.info("mySync : Requesting rooks developing moves " + rooksMovesToRequest)

        mySync({request: rooksMovesToRequest, waitFor: anyMoves})

    }
});

ctx.bthread("DevelopingBishops", "Phase.Opening", function (entity) {
    while (true) {
        let allCells = ctx.runQuery("Cell.all")
        let bishopsMoves = []
        let bishopsArray = ctx.runQuery(getSpecificType('Bishop', 'White'))
        let nonOccupiedCellsSet = ctx.runQuery("Cell.all.nonOccupied")

        for (let i = 0; i < bishopsArray.length; i++) {
            let diagonalBishopMoves = availableDiagonalCellsFromPiece(bishopsArray[i], 7, allCells)[0];
            bishopsMoves = bishopsMoves.concat(diagonalBishopMoves);
        }

        let bishopsMovesSet = clearDuplicates(bishopsMoves)
        let bishopsMovesToRequest = filterOccupiedCellsMoves(bishopsMovesSet, nonOccupiedCellsSet)
        nonOccupiedCellsSet = bishopsArray = bishopsMoves = bishopsMovesSet = null;

        // bp.log.info("mySync : Requesting rooks developing moves " + rooksMovesToRequest)

        mySync({request: bishopsMovesToRequest, waitFor: anyMoves})

    }
});

ctx.bthread("DevelopingQueen", "Phase.Opening", function (entity) {
    while (true) {
        let allCells = ctx.runQuery("Cell.all")
        let queenMoves = []
        let queen = ctx.runQuery(getWhiteQueen())[0]
        let nonOccupiedCellsSet = ctx.runQuery("Cell.all.nonOccupied")
        bp.log.info("~~ LOG (1122) Developing Queen ~~ :  " + JSON.stringify(queen))

        let diagonalQueenMoves = availableDiagonalCellsFromPiece(queen, 7, allCells)[0];
        let straightQueenMoves = availableStraightCellsFromPiece(queen, 7, allCells)[0];
        for (let i = 0; i < diagonalQueenMoves.length; i++) {
            if (ESQueenDevelopingMoves.contains(diagonalQueenMoves[i])) {
                queenMoves.push(diagonalQueenMoves[i]);
            }
        }

        for (let i = 0; i < straightQueenMoves.length; i++) {
            if (ESQueenDevelopingMoves.contains(straightQueenMoves[i])) {
                queenMoves.push(straightQueenMoves[i]);
            }
        }

        bp.log.info("~~ LOG (1120) Developing Queen ~~ Moves :  " + queenMoves)

        let queenMovesSet = clearDuplicates(queenMoves)
        let queenMovesToRequest = filterOccupiedCellsMoves(queenMovesSet, nonOccupiedCellsSet)
        nonOccupiedCellsSet = queen = queenMoves = queenMovesSet = null;

        // bp.log.info("~~ LOG (1122) Developing Queen ~~ Moves :  " + queenMovesToRequest)
        mySync({request: queenMovesToRequest, waitFor: anyMoves})

    }
});

/*ctx.bthread("DevelopingQueen", "Phase.Opening", function (entity) {

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
            // // bp.log.info(queen)
            // //bp.log.info("avalDiagonal ( len =  " + avalDiagonal.length + " ) => " + avalDiagonal)
            // //bp.log.info("avalStraight ( len =  " + avalStraight.length + " ) => " + avalStraight)
            // // bp.log.info(ESQueenDevelopingMoves)
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

            // // bp.log.info("aval2 ( len =  " + aval2.length + " ) => " + aval2)

            queenMoves = queenMoves.concat(aval2);


            let queenMovesSet = clearDuplicates(queenMoves)
            let queenMovesToRequest = filterOccupiedCellsMoves(queenMovesSet, cellsSet)

            // // bp.log.info("Queen Moves To Request ( len =  " + queenMovesToRequest.length + " ) => " + queenMovesToRequest)

            queenMovesSet = queenMoves = cellsSet = allCells = null

            // //bp.log.info("mySync : Requesting bishop developing moves")
            mySync({request: queenMovesToRequest, waitFor: anyMoves})
        }

    }
});*/

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
        // bp.log.info("mySync : Requesting rooks developing moves")
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
            // // bp.log.info("COUNT : " + e + e.data.color)
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

// ctx.bthread("mate on f7", "ready to mate on f7", function (entity) {
//     try {
// //         bp.log.info("bthread : mate on f7")
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
// //             bp.log.info("ready to mate => " + move);
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

/*
This behavioral thread follows one of the basic strategies in chess, particularly in the opening stage.

Mastering the art of capturing in chess is not just about eliminating your opponent's pieces; it's a strategic move that can lead you to victory.
One can do so by attacking and eventually capturing the opponent's pieces.

The pinning tactic is a powerful tool in your chess arsenal. It allows you to restrict your opponent's pieces, opening up opportunities for a decisive move.
The pinning field can be divided into two categories:
    1. Absolute Pin - An absolute pin is the most potent version of this tactic. It happens when a piece is covering an attack on the king.
    Since it is illegal to make a move that would put your king in check, the pinned piece literally cannot move.
    2. Relative Pin - A relative pin happens when, although moving the pinned piece is not illegal, it is not desirable.
    Doing so would allow the other player to gain a winning advantage.
*/
ctx.bthread("AttackingAndPinningTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        let attack = false, pin = false, defend = false
        // // bp.log.info("~~ LOG (1951) ~~ AttackingAndPinningTrack " + JSON.stringify(e.data))
        if (e.data.color == "White") {
            // // bp.log.info("~~ LOG (1453) ~~ The move : " + JSON.stringify(e))
            [attack, pin, defend] = isAttackingOpponentPieceOrDefending(e.data.piece, e.data.dst);
            // // bp.log.info("~~ LOG (1455) ~~ Returned : " + "{ Attack = " + attack + ", Pin = " + pin + ", Defend = " + defend + " }")


            if (attack) {
                let receivedCounter = bp.store.get("Moves Counter: Attacking")
                // // bp.log.info("~~ LOG (1461) ~~ Updating Moves Counter: Attacking Value From " + receivedCounter + " -> " + (receivedCounter + 1))
                // bp.store.put("Moves Counter: Attacking", receivedCounter + 1)
            }
            if (defend) {
                let receivedCounter = bp.store.get("Moves Counter: Defending")
                bp.store.put("Moves Counter: Defending", receivedCounter + 0.5)
            }
            if (pin) {
                let receivedCounter = bp.store.get("Moves Counter: Pinning")
                bp.store.put("Moves Counter: Pinning", receivedCounter + 1)
            }
        }
    }
})

// Defending
ctx.bthread("DefendingTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        if (e.data.color == "White" && isAttackingOpponentPieceOrDefending(e.data.piece, e.data.dst, false)) {

            // let receivedCounter = bp.store.get("Moves Counter: Defending")
            // bp.store.put("Moves Counter: Defending", receivedCounter + 0.5)
        }
    }
})

// ctx.bthread("GeneralTacticsTrack", "Phase.Opening", function (entity) {
//     while (true) {
//         let e = sync({waitFor: anyMoves})
//         if (e.data.color === "White") {
//             if (e.data.takes === true) {
// //                 bp.log.info("UPDATING GENERAL TACTICS, " + e.data)
//                 let returnValuesList = TradingGameTacticCheck(e, e.data.color)
//                 bp.store.put("General Tactics: Take Free Piece", returnValuesList[0])
//                 bp.store.put("General Tactics: Equal Trade", returnValuesList[1])
//                 bp.store.put("General Tactics: Worthwhile Trade", returnValuesList[2])
//                 bp.store.put("General Tactics: Worthless Trade", returnValuesList[3])
//             } else {
//                 bp.store.put("General Tactics: Take Free Piece", 0)
//                 bp.store.put("General Tactics: Equal Trade", 0)
//                 bp.store.put("General Tactics: Worthwhile Trade", 0)
//                 bp.store.put("General Tactics: Worthless Trade", 0)
//             }
//         } else {
//             bp.store.put("General Tactics: Take Free Piece", 0)
//             bp.store.put("General Tactics: Equal Trade", 0)
//             bp.store.put("General Tactics: Worthwhile Trade", 0)
//             bp.store.put("General Tactics: Worthless Trade", 0)
//         }
//     }
// })

/*
ctx.bthread("PieceExchangeTrack", "Phase.Opening", function (entity) {
    while (true) {
        let e = sync({waitFor: anyMoves})
        if (e.data.takes === true && e.data.color === "White") {
            let receivedCounter = bp.store.get("Piece Exchange")
            bp.store.put("Piece Exchange", pieceExchange(e.data.piece, e.data.dst))
        }
    }
})
*/


// Helper functions
function isStrengtheningPawnStructure(dstCell) {
    // 1. Creating Pawn Chain or strong structure       *       *
    //                                                   *       *
    //                                                    *     *
    // 2. Move pawns to support the development of pieces
    // // bp.log.info("isStrengtheningPawnStructure, dstcell = " + dstCell)
    let defaultReturnValue = false;

    let col = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = dstCell[1] - '0';


    let pieceType = "Pawn";
    let color = "White";
    let allWhitePawns = ctx.runQuery(getSpecificType(pieceType, color))
    // // bp.log.info(allWhitePawns);
    if (dstCell.startsWith('h') || dstCell.startsWith('a'))
        return defaultReturnValue;
    else {
        let cellsToExplore = [
            getNextChar(dstCell[0]) + getNextChar(dstCell[1]),
            getNextChar(dstCell[0]) + getPrevChar(dstCell[1]),
            getPrevChar(dstCell[0]) + getNextChar(dstCell[1]),
            getPrevChar(dstCell[0]) + getPrevChar(dstCell[1])
        ]

        // // bp.log.info(cellsToExplore)

        let counter = 0;


        for (let j = 0; j < allWhitePawns.length; j++) {
            if (cellsToExplore.includes(allWhitePawns[j].cellId))
                counter++;
        }

        if (counter >= 2)
            // // bp.log.info("isStrengtheningPawnStructure : return true")
            return true;

    }
}

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

    // // bp.log.info("~~ LOG (1510) ~~ " + piece + " on " + numericCellToCell(row, col, allCells).id)

    for (let i = 1; i <= range; i++) {
        if (row + i <= 8 && row + i >= 1 && col + i <= 8 && col + i >= 1 && checkMeNorthEast) {
            // // bp.log.info("~~ LOG (1575) ~~ numericCellToCell On Cell " + JSON.stringify(numericCellToCell(row + i, col + i, allCells)) + " Returned " + numericCellToCell(row + i, col + i, allCells).pieceId)
            if (numericCellToCell(row + i, col + i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeNorthEast = false;
                // // bp.log.info("~~ LOG (1518) ~~ Searching for piece that occupies the cell " + numericCellToCell(row + i, col + i, allCells).id)
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row + i, col + i, allCells).pieceId))
                // // bp.log.info("~~ LOG (1520) ~~ " + JSON.stringify(pieceInCell))
                // // bp.log.info("~~ LOG (1521) ~~ " + pieceInCell[0].color)
                if (pieceInCell[0].color === 'Black') {
                    return true;
                }
            }
        }
        if (row - i <= 8 && row - i >= 1 && col + i <= 8 && col + i >= 1 && checkMeSouthEast) {
            if (numericCellToCell(row - i, col + i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeSouthEast = false;
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row - i, col + i, allCells).pieceId))
                if (pieceInCell[0].color === 'Black') {
                    return true;
                }
            }
        }
        if (row + i <= 8 && row + i >= 1 && col - i <= 8 && col - i >= 1 && checkMeNorthWest) {
            if (numericCellToCell(row + i, col - i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeNorthWest = false;
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row + i, col - i, allCells).pieceId))
                if (pieceInCell[0].color === 'Black') {
                    return true;
                }
            }
        }
        if (row - i <= 8 && row - i >= 1 && col - i <= 8 && col - i >= 1 && checkMeSouthWest) {
            if (numericCellToCell(row - i, col - i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeSouthWest = false;
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row - i, col - i, allCells).pieceId))
                if (pieceInCell[0].color === 'Black') {
                    return true;
                }
            }
        }
    }

    return false;

}

function isAttackingStraight(piece, dstCell, range) {
    let playerPieces = ctx.runQuery("Piece.White.All")
    let opponentPieces = ctx.runQuery("Piece.Black.All")
    let allCells = ctx.runQuery("Cell.all")

    let col = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = dstCell[1] - '0';

    let checkMeNorth = true;
    let checkMeSouth = true;
    let checkMeWest = true;
    let checkMeEast = true;

    // // bp.log.info("~~ LOG (1579) ~~ " + piece + " on " + numericCellToCell(row, col, allCells).id)
    // // bp.log.info("~~ LOG (1580) North ~~ " + piece + " on " + numericCellToCell(row + 1, col, allCells).id)
    // // bp.log.info("~~ LOG (1581) South ~~ " + piece + " on " + numericCellToCell(row - 1, col, allCells).id)
    // // bp.log.info("~~ LOG (1582) East ~~ " + piece + " on " + numericCellToCell(row, col + 1, allCells).id)
    // // bp.log.info("~~ LOG (1583) West ~~ " + piece + " on " + numericCellToCell(row, col - 1, allCells).id)

    for (let i = 1; i <= range; i++) {
        if (row + i <= 8 && row + i >= 1 && checkMeNorth) {
            if (numericCellToCell(row + i, col, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeNorth = false;
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row + i, col, allCells).pieceId))
                if (pieceInCell[0].color === 'Black') {
                    return true;
                }
            }
        }
        if (row - i <= 8 && row - i >= 1 && checkMeSouth) {
            if (numericCellToCell(row - i, col, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeSouth = false;
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row - i, col, allCells).pieceId))
                if (pieceInCell[0].color === 'Black') {
                    return true;
                }
            }
        }
        if (col + i <= 8 && col + i >= 1 && checkMeEast) {
            if (numericCellToCell(row, col + i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeEast = false;
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row, col + 1, allCells).pieceId))
                if (pieceInCell[0].color === 'Black') {
                    return true;
                }
            }
        }
        if (col - i <= 8 && col - i >= 1 && checkMeWest) {
            if (numericCellToCell(row, col - i, allCells).pieceId === undefined) {
                continue;
            } else {
                checkMeWest = false;
                let pieceInCell = ctx.runQuery(getSpecificPiece(numericCellToCell(row, col - i, allCells).pieceId))
                if (pieceInCell[0].color === 'Black') {
                    return true;
                }
            }
        }
    }

    return false;
}

function isAttackingKnight(piece, dstCell) {
    // Find knight
    let allCells = ctx.runQuery("Cell.all")
    let col = dstCell[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = dstCell[1] - '0';

    let debug = numericCellToCell(row, col, allCells).pieceId;


    // let knight = ctx.runQuery(getSpecificPiece(numericCellToCell(row, col, allCells).pieceId))
    let knight = piece
    // // bp.log.info("~~ LOG (1707) ~~ Knight: " + JSON.stringify(knight) + debug)

    let cellsKnightCanReachWithPieceOccupying = availableKnightMoves(knight)[1]
    // // bp.log.info("~~ LOG (1710) ~~ cellsKnightCanReachWithPieceOccupying: " + cellsKnightCanReachWithPieceOccupying)

    for (let i = 0; i < cellsKnightCanReachWithPieceOccupying.length; i++) {

        let pieceInCell = ctx.runQuery(getSpecificPiece(cellsKnightCanReachWithPieceOccupying[i].pieceId))
        if (pieceInCell[0].color === 'Black') {
            return true;
        }
    }

    return false;
}

function isDefendingPiece(piece, dstCell) {
    return canReachSquare(piece, dstCell, false, false);
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
        // // bp.log.info("~~ LOG (1556) ~~ return true, reason: straight")
        if (whatStandsBetweenPieceAndOpponentKing(piece, pieceCell, "Straight")) {
            return true;
        }
    }

    let col = pieceCell[0].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    let row = pieceCell[1] - '0';
    let colKing = opponentKingCell[0].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    let rowKing = opponentKingCell[1] - '0';

    if (Math.abs(col - colKing) === (Math.abs(row - rowKing)) && diagonalMovement) {
        // // bp.log.info("~~ LOG (1565) ~~ return true, reason: diagonal" + pieceCell + " " + opponentKingCell)
        if (whatStandsBetweenPieceAndOpponentKing(piece, pieceCell, "Diagonal")) {
            return true;
        }
    }

    return false;

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
            // // bp.log.info("~~ LOG (1587) ~~ There is a piece on " + separatingCells[cellIndex] + " = " + JSON.stringify(pieceOnCell[0]))
            counterPieces++;
        }
        if (pieceOnCell[0] !== undefined && pieceOnCell[0].color === "Black") {
            counterOpponentPieces++;
        }
    }

    // // bp.log.info("~~ LOG (1589) ~~ Between " + pieceCell + " and " + opponentKingCell + " there are " + counterPieces + " pieces!, " + counterOpponentPieces +
    //     " of them are black")

    // Time to decide if a pin is still possible

    return counterOpponentPieces === 1 && counterPieces === 1;
}

function allCellsBetweenSourceAndDestination(src, dst, straightOrDiagonal) {
    // //  bp.log.info("~~ LOG (1585) ~~ Check allCellsBetweenSourceAndDestination")
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
            // // bp.log.info("~~ LOG (1600) ~~" + src.charAt(1) + "," + dst.charAt(1))
            if (src.charAt(1) < dst.charAt(1)) {
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
        // // bp.log.info("Diagonal")
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
                // //  bp.log.info("row - " + row + ", col - " + col)
                cells.push(col + row)
            }
        }
    }

    // // bp.log.info("~~ LOG (1629) ~~ Check allCellsBetweenSourceAndDestination between " + src + " -> " + dst + " = " + cells)
    return cells;
}

function findPiece(cell) {
    let piecesArray = ctx.runQuery("Piece.All")

    for (let i = 0; i < piecesArray.length; i++) {
        if (piecesArray[i].cellId === cell) {
            return piecesArray[i] // Found the piec
        }
    }

    return undefined
}

// This is the main thread that handles the attacking, pinning, and defending process */
function isAttackingOpponentPieceOrDefending(piece, dstCell) {

    // Debugging
    // // bp.log.info("~~ LOG (1861) ~~ isAttackingOpponentPieceOrDefending: " + JSON.stringify(piece) + ", on " + dstCell)

    // Initialize all variables and data sets relevant to the bthread

    let playerPieces = ctx.runQuery("Piece.White.All")
    let opponentPieces = ctx.runQuery("Piece.Black.All")
    let allCells = ctx.runQuery("Cell.all")

    // let piecesArray = []
    // let attackingCells = []
    // let availableMoves = []
    let specificPiece = null
    //let pin = false

    const piecesAbleToPin = ["Bishop", "Rook", "Queen"]
    const piecesNotAbleToPin = ["Pawn", "Knight", "King"]

    // Return Values

    let Attacking = false, Pinning = false, Defending = false;


    // Classify Piece

    specificPiece = findPiece(dstCell);

    // Debugging
    // // bp.log.info("~~ LOG (1888) ~~ isAttackingOpponentPieceOrDefending Found Specific " + JSON.stringify(piece) + ", on " + dstCell + " : " + JSON.stringify(specificPiece))

    if (piecesAbleToPin.includes(piece)) {

        switch (piece) {
            case "Bishop":
                // Bishops can attack and defend diagonally
                Pinning = pinning(piece, dstCell, false, true)
                Attacking = isAttackingDiagonal(piece, dstCell, 8, false);
                Defending = isDefendingPiece(piece, dstCell);
                break;
            case "Rook":
                // Rooks can attack and defend in a straight line
                Pinning = pinning(piece, dstCell, true, false)
                Attacking = isAttackingStraight(piece, dstCell, 8);
                Defending = isDefendingPiece(piece, dstCell);
                break;
            case "Queen":
                // The queen is a unique piece that combines the movement of the bishop and the rook and can attack and defend diagonally and also in a straight line
                Pinning = pinning(piece, dstCell, true, true)
                Attacking = isAttackingStraight(piece, dstCell, 8) || isAttackingDiagonal(piece, dstCell, 8, true);
                Defending = isDefendingPiece(piece, dstCell);
                break;
        }
    } else {
        switch (piece) {
            case "Pawn":
                // Pawns can not pin an opponent piece, but they can attack an opponent piece and defend the player pieces
                Attacking = isAttackingDiagonal(piece, dstCell, 1, false);
                Defending = isDefendingPiece(piece, dstCell);
                break;
            case "Knight":
                // Knights can not pin an opponent piece due to their "jumping" movement,  but they can attack an opponent piece and defend the player pieces
                Attacking = isAttackingKnight(specificPiece, dstCell);
                Defending = isDefendingPiece(specificPiece, dstCell);
                break;
            case "King":
                // The king can not pin an opponent piece, but they can attack an opponent piece and defend the player pieces, but beware, it is the most crucial piece in the game
                Attacking = isAttackingDiagonal(piece, dstCell, 1, false) || isAttackingStraight(piece, dstCell, 1);
                Defending = isDefendingPiece(piece, dstCell);
                break;
        }
    }

    /*if (piece)


        if (piece === "Pawn") { // Pawn can only defend the upward diagonal cell ( if the pawn is at the edge of the board \ cells )
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
            specificPiece = findPiece(dstCell)

            // bp.log.info("~~ LOG (1722) ~~ Piece: " + JSON.stringify(specificPiece))

            if (piece === "Bishop" && specificPiece != null) {
                // bp.log.info("Bishop on " + dstCell)
                pin = pinning(piece, dstCell, false, true)
                attackingCells = availableDiagonalCellsFromPiece(specificPiece, 8, allCells)[1]

            } else if (piece === "Knight") {
                isAttackingKnight(dstCell)
                // bp.log.info("Knight on " + dstCell + ", " + specificPiece)
                attackingCells = availableKnightMoves(specificPiece)[1]

            } else if (piece === "Rook") {
                // bp.log.info("Rook on " + dstCell)
                pin = pinning(piece, dstCell, true, false)
                attackingCells = availableStraightCellsFromPiece(specificPiece, 7, allCells)[1]

            } else if (piece === "Queen") {
                // bp.log.info("Queen on " + dstCell)
                pin = pinning(piece, dstCell, true, true)
                attackingCells = availableDiagonalCellsFromPiece(specificPiece, 7, allCells)[1]
                let attackingCells2 = availableStraightCellsFromPiece(specificPiece, 7, allCells)[1]
                for (let i = 0; i < attackingCells2.length; i++) {
                    attackingCells.push(attackingCells2[i])
                }
            }
        }

    let attackingCellsIDs = []

    // bp.log.info("~~ LOG ~~ isAttackingOpponentPieceOrDefending : ( " + piece + " ) Cells to watch (length = " + attackingCells + ")")


    for (let i = 0; i < attackingCells.length; i++) {
        // bp.log.info("~~ LOG (1539) ~~ " + attackingCells[i].id)
        attackingCellsIDs.push(attackingCells[i].id)
    }

    if (attacking) {
        // bp.log.info("attacking mode")
        for (let i = 0; i < opponentPieces.length; i++) {
            if (attackingCellsIDs.includes(opponentPieces[i].cellId)) {
                // bp.log.info("isAttackingOpponentPiece : " + piece + " Attacking opponent's piece on " + opponentPieces[i].cellId)
                return true;
            }
        }

        return false
    } else {
        // bp.log.info("defending mode")
        let playerPieces = ctx.runQuery("Piece.White.All")
        // bp.log.info(playerPieces)
        for (let i = 0; i < playerPieces.length; i++) {
            if (attackingCellsIDs.includes(playerPieces[i].cellId)) {
                // bp.log.info("isAttackingOpponentPiece : " + piece + " Defending player's piece on " + playerPieces[i].cellId)
                return true;
            }
        }

        return false
    }
*/

    // Return a 3 - tuple consists of [Attacking, Pinning, Defending]
    // // bp.log.info("~~ LOG (2017) ~~ Returning : " + "{ Attack = " + Attacking + ", Pin = " + Pinning + ", Defend = " + Defending + " }")

    return [Attacking, Pinning, Defending];
}

/*
    Piece Exchange b-thread
    Explanation:
    Understanding the nuances of piece exchanges is crucial in chess.
    Not all piece exchanges are created equal.
    When considering solely the strength of each piece that is traded, we can define them as being of one of two kinds:
        - Even exchanges occur when the total piece value of both sides of the trade is equal.
        The pieces do not have to be the same as long as the final material count is equivalent for both players.
        - Uneven exchanges happen when the final material count for each side's captured pieces differs.
        The player who gained material then "wins the exchange" or is "up the exchange."
        The player who lost material, on the other hand, "loses the exchange" or is considered to be "down the exchange."

    This b-thread, using the pieces value map shown above, will follow piece exchanges during the game and
     determine which player makes a profit from this exchange.
*/

function pieceExchange(piece, exchangeCell) {

    let freePiece = false, equalTrade = false, worthwhileTrade = false, worthlessTrade = false

    // Debugging
    // bp.log.info("~~ LOG (2050) ~~ piece exchange happens on " + exchangeCell)

    // Initialize all variables and data sets relevant to the bthread

    let playerPieces = ctx.runQuery("Piece.White.All")
    let opponentPieces = ctx.runQuery("Piece.Black.All")
    let allCells = ctx.runQuery("Cell.all")

    // Classify Piece

    let takenPiece = findPiece(exchangeCell);
    if (takenPiece === undefined) // En - Passant
    {
        // bp.log.info("~~ LOG (2050) ~~ the taken piece found on " + exchangeCell[0] + (getPrevChar(exchangeCell[1])))
        takenPiece = findPiece(exchangeCell[0] + (getPrevChar(exchangeCell[1])))
    }

    let opponentPiecesTotalValue = 0;
    let playerPiecesTotalValue = 0;
    let numberOfOpponentPiecesInvolved = 0;
    let numberOfPlayerPiecesInvolved = 0;
    let takenPieceValue = piecesValues[takenPiece.subtype];
    let takingPieceValue = piecesValues[piece.subtype];

    // Debugging
    bp.log.info("~~ LOG (2063) ~~ pieceExchange, exchange on " + exchangeCell + ", Taken into consideration every piece except " + JSON.stringify(takenPiece))

    for (let i = 0; i < opponentPieces.length; i++) {
        if (opponentPieces[i] !== takenPiece && canReachSquareTrading(opponentPieces[i], exchangeCell, true, false)) {
            // bp.log.info("~~ LOG (2072) ~~ pieceExchange, " + JSON.stringify(opponentPieces[i]) + " Can reach " + exchangeCell)
            opponentPiecesTotalValue += piecesValues[opponentPieces[i].subtype];
            numberOfOpponentPiecesInvolved++;
        }
    }

    for (let i = 0; i < playerPieces.length; i++) {
        if (playerPieces[i] !== takenPiece && canReachSquareTrading(playerPieces[i], exchangeCell, true, false)) {
            // bp.log.info("~~ LOG (2072) ~~ pieceExchange, " + JSON.stringify(playerPieces[i]) + " Can reach " + exchangeCell)
            playerPiecesTotalValue += piecesValues[playerPieces[i].subtype]
            numberOfPlayerPiecesInvolved++;
        }
    }

    bp.log.info("~~ LOG (2087) ~~ pieceExchange, opponentPiecesTotalValue =  " + opponentPiecesTotalValue)
    bp.log.info("~~ LOG (2087) ~~ pieceExchange, numberOfOpponentPiecesInvolved =  " + numberOfOpponentPiecesInvolved)
    bp.log.info("~~ LOG (2088) ~~ pieceExchange, playerPiecesTotalValue =  " + playerPiecesTotalValue)
    bp.log.info("~~ LOG (2088) ~~ pieceExchange, numberOfPlayerPiecesInvolved =  " + numberOfPlayerPiecesInvolved)

    let tradeScore = null;

    if (opponentPiecesTotalValue === 0 ||
        (opponentPiecesTotalValue === KING_VALUE && numberOfOpponentPiecesInvolved === 1 && numberOfPlayerPiecesInvolved > 1)) {
        bp.log.info("Free Piece -> Excellent Trade");
        tradeScore = FREE_PIECE;
    } else if ((opponentPiecesTotalValue === playerPiecesTotalValue && numberOfOpponentPiecesInvolved === numberOfPlayerPiecesInvolved) ||
        (takingPieceValue == takenPieceValue)) {
        bp.log.info("Equal Value -> Fair Trade");
        tradeScore = EQUAL_TRADE;
    } else if ((numberOfPlayerPiecesInvolved === numberOfOpponentPiecesInvolved && playerPiecesTotalValue < opponentPiecesTotalValue) ||
        (numberOfPlayerPiecesInvolved > numberOfOpponentPiecesInvolved) ||
        (takingPieceValue < takenPieceValue)) {
        bp.log.info("You can defend this Piece or You've Earned Material -> Good Trade");
        tradeScore = WORTHWHILE_TRADE;
    } else {
        bp.log.info("You should've not capture -> Worthless Trade");
        tradeScore = UNWORTHY_TRADE;
    }

    bp.store.put("Piece Exchange", tradeScore)
}


/*
Those functions are responsible for finding unoccupied cells in a given distance.
Those cells are potential destination cells of moves.
*/

function availableStraightCellsFromPiece(piece, distance, allCells) {
    let col = piece.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    let row = (piece.cellId[1] - '0');

    // bp.log.info("~~ LOG (2107) ~~ availableStraightCellsFromPiece " + piece.subtype + " on " + row + " " + col)

    let availableCells = [];
    let availableMoves = [];
    let cellsWithPiece = [];

    let checkMeWest = true;
    let checkMeEast = true;
    let checkMeSouth = true;
    let checkMeNorth = true;

    for (let i = 1; i <= distance; i++) {
        if (row + i <= 8 && row + i >= 1 && col >= 1 && col <= 8 && checkMeNorth) {
            let check = numericCellToCell(row + i, col, allCells)
            // // bp.log.info("~~ LOG (2040) ~~ Sending this to numericCellToCell : " + (row + i) + "," + col + " Returned => " + JSON.stringify(check))
            if (numericCellToCell(row + i, col, allCells).pieceId === undefined) {
                availableCells.push({row: row + distance, col: col});
                availableMoves.push(moveEvent(piece.subtype, numericCellToCell(row, col, allCells), numericCellToCell(row + i, col, allCells), piece.color));
            } else {
                checkMeNorth = false
                cellsWithPiece.push(numericCellToCell(row + i, col, allCells))
            }
        }
        if (row - i <= 8 && row - i >= 1 && col >= 1 && col <= 8 && checkMeSouth) {
            if (numericCellToCell(row - i, col, allCells).pieceId === undefined) {
                availableCells.push({row: row - distance, col: col});
                availableMoves.push(moveEvent(piece.subtype, numericCellToCell(row, col, allCells), numericCellToCell(row - i, col, allCells), piece.color));
            } else {
                checkMeSouth = false
                cellsWithPiece.push(numericCellToCell(row - i, col, allCells))
            }
        }
        if (col + i <= 8 && col + i >= 1 && row >= 1 && row <= 8 && checkMeEast) {
            if (numericCellToCell(row, col + i, allCells).pieceId === undefined) {
                availableCells.push({row: row, col: col + distance});
                availableMoves.push(moveEvent(piece.subtype, numericCellToCell(row, col, allCells), numericCellToCell(row, col + i, allCells), piece.color));
            } else {
                checkMeEast = false
                cellsWithPiece.push(numericCellToCell(row, col + i, allCells).pieceId)
            }
        }
        if (col - i <= 8 && col - i >= 1 && row >= 1 && row <= 8 && checkMeWest) {
            if (numericCellToCell(row, col - i, allCells).pieceId === undefined) {
                availableCells.push({row: row, col: col - distance});
                availableMoves.push(moveEvent(piece.subtype, numericCellToCell(row, col, allCells), numericCellToCell(row, col - i, allCells), piece.color));
            } else {
                checkMeWest = false
                cellsWithPiece.push(numericCellToCell(row, col - i, allCells).pieceId)
            }
        }
    }
    // bp.log.info("returning cellsWithPieces  " + cellsWithPiece)
    // bp.log.info("returning availableMoves  " + availableMoves)
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

    if (row + 1 <= 8 && row + 1 >= 1 && col >= 1 && col <= 8) {
        if (numericCellToCell(row + 1, col, allCells).pieceId == undefined) {
            availableCells.push({row: row + 1, col: col});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col) + (row + 1), pawn.color));
        }
    }

    if (row + 2 <= 8 && row + 2 >= 1 && col >= 1 && col <= 8) {
        if (numericCellToCell(row + 2, col, allCells).pieceId == undefined) {
            availableCells.push({row: row + 2, col: col});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col) + (row + 2), pawn.color));
        }
    }

    if (col + 1 <= 8 && col + 1 >= 1 && row >= 1 && row <= 8) {
        if (numericCellToCell(row + 1, col + 1, allCells).pieceId != undefined) {
            availableCells.push({row: row + 1, col: col + 1});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col + 1) + (row + 1), pawn.color));
        }
    }

    if (col - 1 <= 8 && col - 1 >= 1 && row >= 1 && row <= 8) {
        if (numericCellToCell(row + 1, col - 1, allCells).pieceId != undefined) {
            availableCells.push({row: row + 1, col: col - 1});
            availableMoves.push(moveEvent("Pawn", jToCol(col) + row, jToCol(col - 1) + (row + 1), pawn.color));
        }
    }

    return availableMoves
}

function availableKnightMoves(knight) {

    // // bp.log.info("~~ LOG (2116) ~~ Knight: " + JSON.stringify(knight))

    // //bp.log.info("availableKnightMoves")
    let allCells = ctx.runQuery("Cell.all")
    let col = knight.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let row = (knight.cellId[1] - '0');
    // // bp.log.info("Row - " + row)
    let availableMoves = []
    let cellsWithPiece = []
    if (row + 1 <= 8 && row + 1 >= 1 && col + 2 <= 8 && col + 2 >= 1) {
        if (numericCellToCell(row + 1, col + 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 2) + (row + 1), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row + 1, col + 2, allCells))
        }
    }
    if (row + 1 <= 8 && row + 1 >= 1 && col - 2 <= 8 && col - 2 >= 1) {
        if (numericCellToCell(row + 1, col - 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 2) + (row + 1), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row + 1, col - 2, allCells))
        }
    }
    if (row - 1 <= 8 && (row - 1) >= 1 && col + 2 <= 8 && col + 2 >= 1) {
        if (numericCellToCell(row - 1, col + 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 2) + (row - 1), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row - 1, col + 2, allCells))
        }
    }
    if (row - 1 <= 8 && (row - 1) >= 1 && col - 2 <= 8 && col - 2 >= 1) {
        if (numericCellToCell(row - 1, col - 2, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 2) + (row - 1), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row - 1, col - 2, allCells))
        }
    }

    if (row + 2 <= 8 && row + 2 >= 1 && col + 1 <= 8 && col + 1 >= 1) {
        if (numericCellToCell(row + 2, col + 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 1) + (row + 2), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row + 2, col + 1, allCells))
        }
    }
    if (row - 2 <= 8 && (row - 2) >= 1 && col + 1 <= 8 && col + 1 >= 1) {
        if (numericCellToCell(row - 2, col + 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col + 1) + (row - 2), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row - 2, col + 1, allCells))
        }
    }
    if (row + 2 <= 8 && row + 2 >= 1 && col - 1 <= 8 && col - 1 >= 1) {
        if (numericCellToCell(row + 2, col - 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 1) + (row + 2), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row + 2, col - 1, allCells))
        }
    }
    if (row - 2 <= 8 && (row - 2) >= 1 && col - 1 <= 8 && col - 1 >= 1) {
        if (numericCellToCell(row - 2, col - 1, allCells).pieceId == undefined) {
            availableMoves.push(moveEvent("Knight", jToCol(col) + row, jToCol(col - 1) + (row - 2), knight.color));
        } else {
            cellsWithPiece.push(numericCellToCell(row - 2, col - 1, allCells))
        }
    }

    // //bp.log.info("Available Knight Moves Returned - " + availableMoves)
    // //bp.log.info("returning cellsWithPieces with length " + cellsWithPiece.length)
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
        case 8:
            j_char = 'h';
            break;
    }
    // bp.log.info("~~ LOG (2310) ~~ J Tol Col : " + j + " => " + j_char)
    return j_char;
}

// Helper function to return the cell object that is represented by the given ID
function GiveMeCell(requestedID, allCells) {
    // // bp.log.info("~~ LOG (2232) ~~ GiveMeCell Received : " + requestedID)
    for (let i = 0; i < allCells.length; i++) {
        let cell = allCells[i]
        if (cell.id === requestedID) {
            return cell;
        }
    }
    // bp.log.info("~~ LOG (2281) ~~ GiveMeCell Returning NULL")
    return null;
}

function availableDiagonalCellsFromPiece(piece, distance, allCells) {
    // // bp.log.info("availableDiagonalCellsFromPiece -> " + JSON.stringify(piece) + ", " + distance + ", " + allCells)
    let col = piece.cellId[0].charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    let row = (piece.cellId[1] - '0');

    bp.log.info("~~ LOG (2304) ~~ availableDiagonalCellsFromPiece " + piece.subtype + " on " + JSON.stringify(numericCellToCell(row, col, allCells)))

    let availableCells = [];

    let availableMoves = [];

    let cellsWithPieces = []

    let checkMeNorthWest = true;
    let checkMeNorthEast = true;
    let checkMeSouthWest = true;
    let checkMeSouthEast = true;

    for (let i = 1; i <= distance; i++) {
        if (row + i <= 8 && row + i >= 1 && col + i <= 8 && col + i >= 1 && checkMeNorthEast) {
            // bp.log.info("~~ LOG (2304) ~~ availableDiagonalCellsFromPiece " + JSON.stringify(numericCellToCell(row + i, col + i, allCells)))
            if (numericCellToCell(row + i, col + i, allCells).pieceId === undefined) {
                availableCells.push({row: row + i, col: col + i});
                availableMoves.push(moveEvent(piece.subtype, numericCellToCell(row, col, allCells), numericCellToCell(row + i, col + i, allCells), piece.color));
            } else {
                checkMeNorthEast = false;
                cellsWithPieces.push(numericCellToCell(row + i, col + i, allCells))
            }
        }
        if (row - i <= 8 && row - i >= 1 && col + i <= 8 && col + i >= 1 && checkMeSouthEast) {
            if (numericCellToCell(row - i, col + i, allCells).pieceId === undefined) {
                availableCells.push({row: row - i, col: col + i});
                availableMoves.push(moveEvent(piece.subtype, numericCellToCell(row, col, allCells), numericCellToCell(row - i, col + i, allCells), piece.color));
            } else {
                checkMeSouthEast = false;
                cellsWithPieces.push(numericCellToCell(row - i, col + i, allCells))
            }
        }
        if (row + i <= 8 && row + i >= 1 && col - i <= 8 && col - i >= 1 && checkMeNorthWest) {
            if (numericCellToCell(row + i, col - i, allCells).pieceId === undefined) {
                availableCells.push({row: row + i, col: col - i});
                availableMoves.push(moveEvent(piece.subtype, numericCellToCell(row, col, allCells), numericCellToCell(row + i, col - i, allCells), piece.color));
            } else {
                checkMeNorthWest = false;
                cellsWithPieces.push(numericCellToCell(row + i, col - i, allCells))
            }
        }
        if (row - i <= 8 && row - i >= 1 && col - i <= 8 && col - i >= 1 && checkMeSouthWest) {
            if (numericCellToCell(row - i, col - i, allCells).pieceId === undefined) {
                availableCells.push({row: row - i, col: col - i});
                availableMoves.push(moveEvent(piece.subtype, numericCellToCell(row, col, allCells), numericCellToCell(row - i, col - i, allCells), piece.color));
            } else {
                checkMeSouthWest = false;
                cellsWithPieces.push(numericCellToCell(row - i, col - i, allCells))
            }
        }
    }

    bp.log.info("returning availableMoves  " + availableMoves)
    return [availableMoves, cellsWithPieces]

}

// Helper function : Convert numeric row & column values to chess board cell
function numericCellToCell(i, j, allCells) { // TODO: For efficiency reasons, move allCells to here
    // // bp.log.info("NumericCellToCell : j = " + j + ", i = " + i + ", allCells: " + allCells)

    // both i and j can and must contain any values in the [1,8]

    let j_char = addNumericValueToChar('a', j - 1);

    let ret = (GiveMeCell(j_char + i, allCells))
    // // bp.log.info("NumericCellToCell : " + (j_char + i) + " Return Value => " + JSON.stringify(ret))

    if (!ret) {
        // // bp.log.info("NumericCellToCell NULL: " + (j_char + i) + " Return Value => " + JSON.stringify(ret))
        return undefined;
    } else {
        // // bp.log.info("NumericCellToCell NOT NULL : " + (j_char + i) + " Return Value => " + JSON.stringify(ret))
        return ret;
    }

}

function addNumericValueToChar(char, valueToAdd) {
    const charCode = char.charCodeAt(0); // Get the Unicode code point of the character
    let newCharCode = charCode;

    if (valueToAdd > 0) {
        newCharCode = charCode + valueToAdd
    }

    // const newCharCode = charCode + valueToAdd; // Add the numeric value
    // Convert the new code point back to a character
    return String.fromCharCode(newCharCode);
}

function getNextChar(char) {
    return String.fromCharCode(char.charCodeAt(0) + 1);
}

function getPrevChar(char) {
    return String.fromCharCode(char.charCodeAt(0) - 1);
}

// Visualization ( Help debug process )
ctx.bthread("Visualize", "Phase.Opening", function (entity) {

    // White pieces are represented by capital characters, whereas non-capital characters are used to symbolize black pieces
    // Todo: make with correlation to the board, go through cells and print their content
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
        // // bp.log.info("~~ LOG (2371) ~~ " + move)
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
        } else if (move.data.takes === true) {

        }

        bp.log.info(ANSI_CYAN + move + ANSI_RESET)
        // Visualize
        for (let i = 0; i < 8; i++) {

            bp.log.info(ANSI_PURPLE + currentBoard[i][0] + "  " + currentBoard[i][1] + "  " + currentBoard[i][2] + "  " +
                currentBoard[i][3] + "  " + currentBoard[i][4] + "  " + currentBoard[i][5] + "  " +
                currentBoard[i][6] + "  " + currentBoard[i][7] + ANSI_RESET);

        }
        bp.log.info(ANSI_CYAN + "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ " + "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ " + ANSI_RESET)

    }
});