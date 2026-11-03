#!/usr/bin/env python3
"""Reject private project material before publishing the static site.

Only paths and reasons are logged; never print rejected content.
The hash denylist catches byte-identical assets even after they are renamed.
This does not erase Git history or detect every possible transformed copy.
"""
import hashlib
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_NAME = re.compile(r"grace[-_ ]?together|건강동행", re.IGNORECASE)
PRIVATE_CONTENT = re.compile(rb"grace[-_ ]?together|" + "건강동행".encode(), re.IGNORECASE)
# These control files contain the rules, never private document bodies.
CONTROL_FILES = {".gitignore", "scripts/check-public-content.py", "tests/test_public_content.py"}
PRIVATE_HASHES = frozenset([
    "0618bf719567676edd5022b234efeb6ba0f5bd57826b9adb6c7da2a33f6cf366",
    "143efdc2210065cf422fec894f26425bd82a5fecd66be9074e188b8ba1aa0619",
    "1daa5fcc7ecc2e7f9ea16ed02bbaaf96b2b5140753d5bb190d22023b214c21a5",
    "2251160f546b5437c35ca9f6fe01f5ee74e7e60f17fbe6b3ddf083c6e574091d",
    "2c36329d1dd70905911e07a4363e3f6580f3609693449975f68f5f7c620e5ffd",
    "2ed789e75a70e873d01ae330aff173603f39eb65dd414c09f6da8353b4c736dd",
    "2f218c6a22e99adc175d457c521ebdfe26edc5e3c583f3983909e4e3dbcc76d7",
    "34da85b5f9325dc332a212d4d42d3a0fdd6b09f562444fd69316259385944438",
    "42ea52aabcf77faaad904750d408a228e0a1497b359f200f32403a537d1a9094",
    "468bb8aa831743fa8f774e47466a7aed78683782406d493717f435f2c839040c",
    "62939f13cfdcfc6c34565f09bd6bf70b6baad5dc0477b68062953add2ac135cb",
    "6b4adad04b3a478f8be388dd78bd867ca9b525aab11618f601b9b89fc25cfa4e",
    "7abccabc8ad86f8e03f5e0515fcd5345da3a1ccfa52b7e133cb77c55de9aee7d",
    "820a4a5541ebbcb0e3ed70e5d7ac0581ccbec4d272778fc6d65f4850c0644d7e",
    "84af3bc882ab435963c87b44b12302285e424aaf688553fd3971ad53ba609c9c",
    "8b267a11fff727b948590cc62c620239d15af95067a6faae0e961962dea82f90",
    "91661ea0f74369d8f7a139073ff56a6edc7cf86d2a1fc689360e8ef465da401c",
    "9187175ec6d9277c4d00d3ec86ce6451aab3075595dc4ccf5f40e79db873f21d",
    "9246a6b8a013021c54346e6c96f3f850fafe56ac13e09dd3ff9b75f630b59eab",
    "98196cba88afa8159b97742916068132882d05127c5fef4db2447c3770afdbb2",
    "9d6b2ec58f0633a3297a2428986c8730d3a2a2ea510f05d05b59fdad42d3e51a",
    "a19ed940579f49eb55e0b517fe6fdcec3b48f09c85c8bd3170759a25d34228de",
    "a5cd1ab46e4454f37099a7f06cc64ec39a93684dcebdf2537f03a4cbedbeac48",
    "a7cbe88da669602ab932e8a428987bb0ad74d2a40bcf9f59a3f95ac3cd75da97",
    "aa09b39ea4e9c8470010351cb1730f4fc5b36f60c199bacc8b915538761b8176",
    "acca6dab8c207a36930944e141d4de485187b66dae4fba97da6d125f9746f981",
    "aebf1bee6b54e5c75842e9fc0df7ecef9a88fa26ed30bd4831d32aaeda60fb9c",
    "b09529f1e2c675b680d48ea7f59168a930907b2e691e9fed9f9eaf9af5a81511",
    "b3b9681ace14ab3e201dddba12fd83fa6758f32ec255ff823b4ea4aab342352b",
    "b6de18fac5311d5f40f77a2d376bd9f58abd273faea818828d4734d4a2c86a81",
    "be1e651778f4c293597c9798f88814a95ee2b48fd426cf9b4900b8c8d887d42c",
    "c002eef1326e4c36f8e2589a2bc59e6be92a19bd603f632692a86d325030e149",
    "c076590e4fc241f99a09ed656b8101265f9840adbab5aa3765fe812321bd1992",
    "c3265e8e911be157a6992022871c26f8e81ffe761df5db0319b671198016a581",
    "c43a15fa119f7d63c6bf985f94e73938bb63ea72bb8adb4e9248f89e9e48497a",
    "c66ebe6b5dee00e8a65c0fdae80b175856e38d139068415348c23e55758ec76a",
    "c7e661c6904556b174d2979b41f68a2d17a3e6a48c77cda9f4122652112cfc61",
    "cd457ced84e69b2a52cb35a18eb4ec610af6fb2933b55a7a535367e5f135fc29",
    "d36ff7b09630ec3fd6c0552e6d5eedc8ea48fe437a010de9e1ef33375aa38ba8",
    "d72b095f68938789fb01da5e105fa7d5758871a6f158ee3707d7b57506722335",
    "e22c5876e868a1814fa34f62520547f2ec207cb7a81e7c229ff551010604384b",
    "e3b415286c7ec45888562444f44e171c99accf718409ec5410f84d7aeb8d63b9",
    "ea0199ce20ae6463aff636a65ba296e24c88af3ce16d918ae8e071f58752864d",
    "eb916d9e75369fc337ef6478d18a9c32d9ea14f573e863a0d7498d64b3128da1",
    "eeca8968dc345119ddf55e3c75ef8cd0d150463fd281c6e4937c6311262884dd",
    "f364c9397d957b76c506d52150e4b9e92bf9a723e3b93862c046c3af66d644cc",
    "f57382050e24780019fa6481d1a048764d1a0f9a8b53806ea6a63cab7550a1a5",
    "f954ec54910162811fd6d62f7ab2a85df8b4860336e458ec14291303878db0d7",
    "fba3dc26e4a6f45a7af913628abfd4ab46fca3b9264b8307d2ddd07c73ab4183",
])


def violations(path, content):
    """Return non-sensitive reasons for a repository-relative file."""
    reasons = []
    if PRIVATE_NAME.search(path) or path.startswith(".private/"):
        reasons.append("private path")
    if hashlib.sha256(content).hexdigest() in PRIVATE_HASHES:
        reasons.append("removed private file fingerprint")
    if path not in CONTROL_FILES and PRIVATE_CONTENT.search(content):
        reasons.append("private project content or reference")
    return reasons


def main():
    paths = subprocess.check_output(
        ["git", "ls-files", "--cached", "-z"], cwd=ROOT
    ).decode().split("\0")
    failures = []
    checked = 0
    for name in filter(None, paths):
        path = ROOT / name
        if path.is_symlink():
            failures.append((name, ["symlinks are not allowed in Pages artifacts"]))
            continue
        if not path.exists():
            # A tracked deletion is absent from the publication input.
            continue
        reasons = violations(name, path.read_bytes())
        if reasons:
            failures.append((name, reasons))
        checked += 1
    for name, reasons in failures:
        print("FAIL", name, ":", "; ".join(reasons))
    print(f"Public content boundary: {checked} tracked files checked; {len(failures)} failures")
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
