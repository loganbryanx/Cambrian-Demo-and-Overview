using Cambrian.Api.DTOs;
using Cambrian.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cambrian.Api.Controllers;

/// <summary>
/// Manages track discovery and creator uploads.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TracksController : ControllerBase
{
    private readonly ITrackService _trackService;
    private readonly ILogger<TracksController> _logger;

    public TracksController(ITrackService trackService, ILogger<TracksController> logger)
    {
        _trackService = trackService;
        _logger = logger;
    }

    // GET api/tracks?search=neon&genre=Electronic&page=1&pageSize=20
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResult<TrackSummaryDto>>> GetTracks(
        [FromQuery] TrackQueryParams queryParams,
        CancellationToken ct)
    {
        var result = await _trackService.SearchTracksAsync(queryParams, ct);
        return Ok(result);
    }

    // GET api/tracks/{id}
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<TrackDetailDto>> GetTrack(string id, CancellationToken ct)
    {
        var track = await _trackService.GetByIdAsync(id, ct);
        if (track is null)
            return NotFound(new { message = $"Track '{id}' not found." });

        return Ok(track);
    }

    // POST api/tracks  (multipart/form-data)
    [HttpPost]
    [Authorize(Roles = "Creator")]
    [RequestSizeLimit(110_000_000)] // 110 MB
    public async Task<ActionResult<TrackUploadResultDto>> UploadTrack(
        [FromForm] UploadTrackRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var creatorId = User.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("User ID claim missing.");

        var result = await _trackService.UploadAsync(creatorId, request, ct);

        _logger.LogInformation("Track {TrackId} queued for processing by creator {CreatorId}.",
            result.Id, creatorId);

        return CreatedAtAction(nameof(GetTrack), new { id = result.Id }, result);
    }

    // DELETE api/tracks/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Creator,Admin")]
    public async Task<IActionResult> DeleteTrack(string id, CancellationToken ct)
    {
        var userId = User.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("User ID claim missing.");
        var isAdmin = User.IsInRole("Admin");

        var deleted = await _trackService.DeleteAsync(id, userId, isAdmin, ct);
        if (!deleted)
            return NotFound(new { message = $"Track '{id}' not found or not owned by you." });

        return NoContent();
    }
}
